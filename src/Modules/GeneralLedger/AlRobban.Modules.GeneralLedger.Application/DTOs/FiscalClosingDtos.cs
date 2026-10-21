namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record YearEndAuditCheckDto(
    Guid FiscalYearId,
    int YearNumber,
    string YearNameAr,
    DateTime StartDate,
    DateTime EndDate,
    bool IsAlreadyClosed,
    bool CanClose,
    List<string> BlockingErrors,
    List<string> Warnings,
    int DraftJournalEntriesCount,
    int TotalPostedJournalEntriesCount,
    int OpenPeriodsCount,
    decimal TotalRevenuesToClose,
    decimal TotalExpensesToClose,
    decimal ProjectedNetIncome,
    string ProjectedNetIncomeTafqeetAr,
    Guid DefaultRetainedEarningsAccountId,
    string DefaultRetainedEarningsAccountCode,
    string DefaultRetainedEarningsAccountNameAr);

public record CloseFiscalYearRequest(
    Guid? RetainedEarningsAccountId,
    bool GenerateOpeningBalanceNextYear = true);

public record YearEndClosingResultDto(
    Guid FiscalYearId,
    int YearNumber,
    Guid ClosingJournalEntryId,
    string ClosingJournalEntryNumber,
    decimal NetProfitOrLoss,
    string NetProfitOrLossTafqeetAr,
    decimal TotalRevenuesClosed,
    decimal TotalExpensesClosed,
    DateTime ClosedAtUtc,
    bool NextYearCreated,
    Guid? NextFiscalYearId,
    string? OpeningJournalEntryNumber);
