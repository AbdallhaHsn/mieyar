using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record BankAccountSummaryDto(
    Guid AccountId,
    string AccountCode,
    string AccountNameAr,
    string AccountNameEn,
    decimal CurrentLedgerBalance);

public record BankReconciliationTransactionDto(
    Guid JournalEntryLineId,
    DateTime TransactionDate,
    string EntryNumber,
    string? ReferenceNumber,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal NetAmount,
    bool IsMatched);

public record BankReconciliationWorkspaceDto(
    Guid BankAccountId,
    string BankAccountCode,
    string BankAccountNameAr,
    DateTime StatementDate,
    decimal BookBalance,
    decimal StatementEndingBalance,
    decimal ClearedDeposits,
    decimal ClearedWithdrawals,
    decimal ClearedBalance,
    decimal Difference,
    List<BankReconciliationTransactionDto> Transactions);

public record SaveBankReconciliationRequest(
    Guid CompanyId,
    Guid BankAccountId,
    DateTime StatementDate,
    decimal StatementEndingBalance,
    string? Notes,
    List<Guid> MatchedJournalLineIds,
    bool Finalize = false);

public record BankReconciliationResultDto(
    Guid ReconciliationId,
    string ReconciliationNumber,
    Guid BankAccountId,
    string BankAccountCode,
    string BankAccountNameAr,
    DateTime StatementDate,
    decimal StatementEndingBalance,
    decimal BookBalance,
    decimal ClearedDeposits,
    decimal ClearedWithdrawals,
    decimal Difference,
    BankReconciliationStatus Status,
    string StatusNameAr,
    DateTime? ReconciledAtUtc,
    string? ReconciledBy,
    string? Notes);

public record ImportedStatementRowDto(
    DateTime TransactionDate,
    string? ReferenceNumber,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Amount);

public record ImportBankStatementRequest(
    Guid CompanyId,
    Guid BankAccountId,
    string RawCsvOrText,
    DateTime? StatementDate,
    decimal? StatementEndingBalance);

public record AutoMatchResultDto(
    int TotalStatementRows,
    int MatchedRowsCount,
    int UnmatchedRowsCount,
    decimal TotalMatchedAmount,
    List<Guid> MatchedJournalLineIds,
    List<BankReconciliationTransactionDto> UpdatedTransactions,
    string Message);

public record CreateBankAdjustmentEntryRequest(
    Guid CompanyId,
    Guid BankAccountId,
    Guid CounterAccountId,
    decimal Amount,
    bool IsExpenseOrWithdrawal,
    DateTime EntryDate,
    string Description,
    string? ReferenceNumber = null);


