using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public enum BankReconciliationStatus
{
    Draft = 1,
    Completed = 2
}

public class BankReconciliation : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid BankAccountId { get; private set; }
    public Account? BankAccount { get; private set; }
    public string ReconciliationNumber { get; private set; } = string.Empty;
    public DateTime StatementDate { get; private set; }
    public decimal StatementEndingBalance { get; private set; }
    public decimal BookBalance { get; private set; }
    public decimal ClearedDeposits { get; private set; }
    public decimal ClearedWithdrawals { get; private set; }
    public decimal Difference { get; private set; }
    public BankReconciliationStatus Status { get; private set; } = BankReconciliationStatus.Draft;
    public string? Notes { get; private set; }
    public DateTime? ReconciledAtUtc { get; private set; }
    public string? ReconciledBy { get; private set; }

    public List<BankReconciliationItem> Items { get; private set; } = new();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private BankReconciliation() { }

    public static BankReconciliation Create(
        Guid tenantId,
        Guid companyId,
        Guid bankAccountId,
        string reconciliationNumber,
        DateTime statementDate,
        decimal statementEndingBalance,
        decimal bookBalance,
        string? notes = null,
        string? createdBy = null)
    {
        return new BankReconciliation
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            BankAccountId = bankAccountId,
            ReconciliationNumber = reconciliationNumber,
            StatementDate = statementDate.Date,
            StatementEndingBalance = statementEndingBalance,
            BookBalance = bookBalance,
            Status = BankReconciliationStatus.Draft,
            Notes = notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddItem(
        Guid journalEntryLineId,
        DateTime transactionDate,
        string? referenceNumber,
        string? description,
        decimal debit,
        decimal credit,
        bool isMatched)
    {
        var item = BankReconciliationItem.Create(
            TenantId,
            CompanyId,
            Id,
            journalEntryLineId,
            transactionDate,
            referenceNumber,
            description,
            debit,
            credit,
            isMatched);

        Items.Add(item);
    }

    public void RecalculateTotals()
    {
        ClearedDeposits = Items.Where(i => i.IsMatched).Sum(i => i.Debit);
        ClearedWithdrawals = Items.Where(i => i.IsMatched).Sum(i => i.Credit);
        
        // In Bank Reconciliation:
        // Adjusted Bank Balance = StatementEndingBalance + Deposits in Transit - Outstanding Cheques
        // Difference = StatementEndingBalance - (BookBalance + ClearedWithdrawals - ClearedDeposits)
        var clearedNet = ClearedDeposits - ClearedWithdrawals;
        Difference = StatementEndingBalance - (BookBalance - (Items.Sum(i => i.Debit - i.Credit) - clearedNet));
    }

    public void Complete(string reconciledBy)
    {
        Status = BankReconciliationStatus.Completed;
        ReconciledAtUtc = DateTime.UtcNow;
        ReconciledBy = reconciledBy;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = reconciledBy;
    }
}

public class BankReconciliationItem : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BankReconciliationId { get; set; }
    public Guid JournalEntryLineId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public bool IsMatched { get; set; }
    public DateTime? MatchedAtUtc { get; set; }

    public BankReconciliation? BankReconciliation { get; set; }

    public BankReconciliationItem() { }

    public static BankReconciliationItem Create(
        Guid tenantId,
        Guid companyId,
        Guid bankReconciliationId,
        Guid journalEntryLineId,
        DateTime transactionDate,
        string? referenceNumber,
        string? description,
        decimal debit,
        decimal credit,
        bool isMatched)
    {
        return new BankReconciliationItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            BankReconciliationId = bankReconciliationId,
            JournalEntryLineId = journalEntryLineId,
            TransactionDate = transactionDate,
            ReferenceNumber = referenceNumber,
            Description = description,
            Debit = debit,
            Credit = credit,
            IsMatched = isMatched,
            MatchedAtUtc = isMatched ? DateTime.UtcNow : null
        };
    }
}
