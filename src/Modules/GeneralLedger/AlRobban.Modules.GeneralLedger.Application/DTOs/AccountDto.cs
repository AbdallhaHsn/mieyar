using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record AccountDto
{
    public Guid Id { get; init; }
    public Guid CompanyId { get; init; }
    public string AccountCode { get; init; } = string.Empty;
    public string NameAr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string? Description { get; init; }
    public Guid? ParentAccountId { get; init; }
    public string? ParentAccountCode { get; init; }
    public string? ParentAccountName { get; init; }
    public int Level { get; init; }
    public AccountType AccountType { get; init; }
    public string AccountTypeNameAr => AccountType switch
    {
        AccountType.Asset => "أصول",
        AccountType.Liability => "التزامات وخصوم",
        AccountType.Equity => "حقوق ملكية",
        AccountType.Revenue => "إيرادات ومبيعات",
        AccountType.Expense => "مصروفات وتكاليف",
        _ => "غير محدد"
    };
    public AccountNature AccountNature { get; init; }
    public string AccountNatureNameAr => AccountNature == AccountNature.Debit ? "مدين (Debit)" : "دائن (Credit)";
    public FinancialStatement FinancialStatement { get; init; }
    public string FinancialStatementNameAr => FinancialStatement == FinancialStatement.BalanceSheet ? "قائمة المركز المالي" : "قائمة الدخل";
    public bool IsPostable { get; init; }
    public bool IsActive { get; init; }
    public string CurrencyCode { get; init; } = "SAR";
    public decimal CurrentBalance { get; init; }
    public AccountingStandardGuidance? Guidance { get; init; }
    public List<AccountDto> SubAccounts { get; set; } = new();
    public bool HasChildren => SubAccounts.Count > 0;

    public static AccountDto FromEntity(Account entity)
    {
        return new AccountDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            AccountCode = entity.AccountCode,
            NameAr = entity.NameAr,
            NameEn = entity.NameEn,
            Description = entity.Description,
            ParentAccountId = entity.ParentAccountId,
            ParentAccountCode = entity.ParentAccount?.AccountCode,
            ParentAccountName = entity.ParentAccount?.NameAr,
            Level = entity.Level,
            AccountType = entity.AccountType,
            AccountNature = entity.AccountNature,
            FinancialStatement = entity.FinancialStatement,
            IsPostable = entity.IsPostable,
            IsActive = entity.IsActive,
            CurrencyCode = entity.CurrencyCode,
            CurrentBalance = entity.CurrentBalance,
            Guidance = entity.Guidance
        };
    }
}
