using System.Text;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountsTree;

public record ExportAccountsCsvQuery(Guid? CompanyId) : IRequest<Result<AccountsCsvExportDto>>;

public record AccountsCsvExportDto(byte[] FileBytes, string FileName, string ContentType);

public class ExportAccountsCsvQueryHandler : IRequestHandler<ExportAccountsCsvQuery, Result<AccountsCsvExportDto>>
{
    private readonly IAccountRepository _accountRepository;

    public ExportAccountsCsvQueryHandler(IAccountRepository accountRepository)
    {
        _accountRepository = accountRepository;
    }

    public async Task<Result<AccountsCsvExportDto>> Handle(ExportAccountsCsvQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");
        var accounts = await _accountRepository.GetAllByCompanyAsync(companyId, cancellationToken);

        var sortedAccounts = accounts.OrderBy(a => a.AccountCode).ToList();
        var lookup = sortedAccounts.ToDictionary(a => a.Id, a => a.AccountCode);

        var sb = new StringBuilder();
        // CSV Header with Arabic and English
        sb.AppendLine("AccountCode,NameAr,NameEn,AccountType,AccountNature,IsPostable,Level,ParentAccountCode,StandardCode,CurrentBalance,Description");

        foreach (var acc in sortedAccounts)
        {
            var parentCode = acc.ParentAccountId.HasValue && lookup.TryGetValue(acc.ParentAccountId.Value, out var pCode)
                ? pCode
                : "";

            var standardCode = acc.Guidance?.StandardCode ?? "";
            var desc = (acc.Description ?? "").Replace("\"", "\"\"");

            sb.AppendLine($"\"{acc.AccountCode}\",\"{EscapeCsv(acc.NameAr)}\",\"{EscapeCsv(acc.NameEn)}\",\"{acc.AccountType}\",\"{acc.AccountNature}\",\"{acc.IsPostable}\",\"{acc.Level}\",\"{parentCode}\",\"{standardCode}\",\"{acc.CurrentBalance:F2}\",\"{desc}\"");
        }

        // UTF-8 BOM so Excel opens Arabic correctly
        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fileBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fileBytes, preamble.Length, contentBytes.Length);

        var fileName = $"ChartOfAccounts_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return Result.Success(new AccountsCsvExportDto(fileBytes, fileName, "text/csv; charset=utf-8"));
    }

    private static string EscapeCsv(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        return text.Replace("\"", "\"\"");
    }
}
