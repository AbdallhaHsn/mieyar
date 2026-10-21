using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record GeneralLedgerAccountOverviewDto(
    Guid AccountId,
    string AccountCode,
    string NameAr,
    string NameEn,
    AccountType AccountType,
    AccountNature AccountNature,
    decimal OpeningBalance,
    decimal PeriodDebit,
    decimal PeriodCredit,
    decimal NetMovement,
    decimal ClosingBalance,
    int TransactionCount,
    DateTime? LastActivityDate
);

public record GeneralLedgerReportDto(
    List<GeneralLedgerAccountOverviewDto> Accounts,
    DateTime FromDate,
    DateTime ToDate,
    decimal TotalOpeningBalance,
    decimal TotalPeriodDebit,
    decimal TotalPeriodCredit,
    decimal TotalClosingBalance,
    int ActiveAccountsCount
);

public record AccountStatementLineDto(
    Guid LineId,
    Guid JournalEntryId,
    string EntryNumber,
    DateTime EntryDate,
    JournalEntryType EntryType,
    string? ReferenceNumber,
    string Description,
    Guid? CostCenterId,
    string? CostCenterName,
    decimal Debit,
    decimal Credit,
    decimal RunningBalance
);

public record AccountStatementAccountHeaderDto(
    Guid Id,
    string AccountCode,
    string NameAr,
    string NameEn,
    AccountType AccountType,
    AccountNature AccountNature,
    string CurrencyCode,
    string? ParentAccountNameAr
);

public record AccountStatementDto(
    AccountStatementAccountHeaderDto Account,
    DateTime FromDate,
    DateTime ToDate,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal NetMovement,
    decimal ClosingBalance,
    int TransactionCount,
    List<AccountStatementLineDto> Lines
);
