using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Standards;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.CreateAccount;

public record ImportAccountsFromCsvCommand(
    string CsvContent,
    Guid? CompanyId = null
) : IRequest<Result<ImportAccountsResultDto>>;

public record ImportAccountsResultDto(
    int TotalRows,
    int CreatedCount,
    int UpdatedCount,
    int ErrorCount,
    IReadOnlyList<string> ErrorMessages
);

public class ImportAccountsFromCsvCommandHandler : IRequestHandler<ImportAccountsFromCsvCommand, Result<ImportAccountsResultDto>>
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public ImportAccountsFromCsvCommandHandler(
        IAccountRepository accountRepository,
        ICurrentTenantContext tenantContext)
    {
        _accountRepository = accountRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<ImportAccountsResultDto>> Handle(ImportAccountsFromCsvCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        if (string.IsNullOrWhiteSpace(request.CsvContent))
        {
            return Result.Failure<ImportAccountsResultDto>(Error.Validation("Csv.Empty", "ملف أو محتوى الـ CSV فارغ."));
        }

        var lines = request.CsvContent.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length <= 1)
        {
            return Result.Failure<ImportAccountsResultDto>(Error.Validation("Csv.NoData", "الملف لا يحتوي على بيانات حسابات."));
        }

        var existingAccounts = (await _accountRepository.GetAllByCompanyAsync(companyId, cancellationToken))
            .ToDictionary(a => a.AccountCode, a => a);

        var errors = new List<string>();
        int created = 0;
        int updated = 0;

        // Skip header line
        var dataRows = lines.Skip(1).ToList();

        // Parse rows first
        var parsedRows = new List<ParsedAccountRow>();
        for (int i = 0; i < dataRows.Count; i++)
        {
            var line = dataRows[i].Trim();
            if (string.IsNullOrWhiteSpace(line)) continue;

            var cols = ParseCsvLine(line);
            if (cols.Count < 3)
            {
                errors.Add($"سطر {i + 2}: عدد الأعمدة غير كافٍ.");
                continue;
            }

            var accountCode = cols[0].Trim();
            var nameAr = cols[1].Trim();
            var nameEn = cols.Count > 2 ? cols[2].Trim() : nameAr;
            var accountTypeStr = cols.Count > 3 ? cols[3].Trim() : "";
            var accountNatureStr = cols.Count > 4 ? cols[4].Trim() : "";
            var isPostableStr = cols.Count > 5 ? cols[5].Trim() : "true";
            var parentCode = cols.Count > 7 ? cols[7].Trim() : "";
            var standardCode = cols.Count > 8 ? cols[8].Trim() : "";
            var description = cols.Count > 10 ? cols[10].Trim() : "";

            if (string.IsNullOrWhiteSpace(accountCode) || string.IsNullOrWhiteSpace(nameAr))
            {
                errors.Add($"سطر {i + 2}: كود الحساب واسمه العربي مطلوبان.");
                continue;
            }

            parsedRows.Add(new ParsedAccountRow(
                i + 2,
                accountCode,
                nameAr,
                nameEn,
                accountTypeStr,
                accountNatureStr,
                isPostableStr,
                parentCode,
                standardCode,
                description
            ));
        }

        // Sort by code length or level so parent accounts are processed first
        parsedRows = parsedRows.OrderBy(r => r.AccountCode.Length).ThenBy(r => r.AccountCode).ToList();

        foreach (var row in parsedRows)
        {
            try
            {
                var guidance = !string.IsNullOrWhiteSpace(row.StandardCode)
                    ? IfrsStandardCatalog.GetByCode(row.StandardCode)
                    : null;

                bool isPostable = bool.TryParse(row.IsPostableStr, out var ip) ? ip : true;

                if (existingAccounts.TryGetValue(row.AccountCode, out var existing))
                {
                    existing.UpdateDetails(row.NameAr, row.NameEn, row.Description, true);
                    if (guidance != null) existing.SetGuidance(guidance);
                    updated++;
                }
                else
                {
                    Account newAccount;
                    if (!string.IsNullOrWhiteSpace(row.ParentCode) && existingAccounts.TryGetValue(row.ParentCode, out var parent))
                    {
                        newAccount = Account.CreateSubAccount(
                            tenantId: tenantId,
                            companyId: companyId,
                            parentAccount: parent,
                            accountCode: row.AccountCode,
                            nameAr: row.NameAr,
                            nameEn: row.NameEn,
                            isPostable: isPostable,
                            guidance: guidance,
                            description: row.Description
                        );
                    }
                    else
                    {
                        // Parse root account types
                        Enum.TryParse<AccountType>(row.AccountTypeStr, true, out var aType);
                        if (aType == 0) aType = AccountType.Asset;

                        Enum.TryParse<AccountNature>(row.AccountNatureStr, true, out var aNature);
                        if (aNature == 0)
                        {
                            aNature = (aType == AccountType.Asset || aType == AccountType.Expense)
                                ? AccountNature.Debit
                                : AccountNature.Credit;
                        }

                        var finStatement = (aType == AccountType.Revenue || aType == AccountType.Expense)
                            ? FinancialStatement.IncomeStatement
                            : FinancialStatement.BalanceSheet;

                        newAccount = Account.CreateRoot(
                            tenantId: tenantId,
                            companyId: companyId,
                            accountCode: row.AccountCode,
                            nameAr: row.NameAr,
                            nameEn: row.NameEn,
                            accountType: aType,
                            accountNature: aNature,
                            financialStatement: finStatement,
                            guidance: guidance,
                            description: row.Description
                        );
                    }

                    await _accountRepository.AddAsync(newAccount, cancellationToken);
                    existingAccounts[row.AccountCode] = newAccount;
                    created++;
                }
            }
            catch (Exception ex)
            {
                errors.Add($"سطر {row.LineNumber} (كود {row.AccountCode}): {ex.Message}");
            }
        }

        await _accountRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(new ImportAccountsResultDto(
            TotalRows: parsedRows.Count,
            CreatedCount: created,
            UpdatedCount: updated,
            ErrorCount: errors.Count,
            ErrorMessages: errors
        ));
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var current = new System.Text.StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '\"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '\"')
                {
                    current.Append('\"');
                    i++; // skip next quote
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }
        result.Add(current.ToString());
        return result;
    }

    private record ParsedAccountRow(
        int LineNumber,
        string AccountCode,
        string NameAr,
        string NameEn,
        string AccountTypeStr,
        string AccountNatureStr,
        string IsPostableStr,
        string ParentCode,
        string StandardCode,
        string Description
    );
}
