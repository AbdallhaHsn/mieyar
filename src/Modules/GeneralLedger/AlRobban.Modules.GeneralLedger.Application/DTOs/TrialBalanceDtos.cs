using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

/// <summary>
/// يمثل سطراً في ميزان المراجعة بالمجاميع والأرصدة لحساب رئيسي أو تحليلي
/// </summary>
public record TrialBalanceAccountDto(
    Guid AccountId,
    string AccountCode,
    string NameAr,
    string NameEn,
    AccountType AccountType,
    AccountNature AccountNature,
    int Level,
    Guid? ParentAccountId,
    bool IsPostable,
    decimal OpeningDebit,
    decimal OpeningCredit,
    decimal PeriodDebit,
    decimal PeriodCredit,
    decimal EndingDebit,
    decimal EndingCredit,
    List<TrialBalanceAccountDto> SubAccounts
);

/// <summary>
/// تقرير ميزان المراجعة بالمجاميع والأرصدة الشامل للشركة
/// </summary>
public record TrialBalanceReportDto(
    DateTime FromDate,
    DateTime ToDate,
    decimal TotalOpeningDebit,
    decimal TotalOpeningCredit,
    decimal TotalPeriodDebit,
    decimal TotalPeriodCredit,
    decimal TotalEndingDebit,
    decimal TotalEndingCredit,
    bool IsBalanced,
    decimal BalanceDifference,
    int TotalAccountsCount,
    List<TrialBalanceAccountDto> Accounts
);
