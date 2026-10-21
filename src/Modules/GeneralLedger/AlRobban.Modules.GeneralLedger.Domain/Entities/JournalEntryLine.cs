using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class JournalEntryLine : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid JournalEntryId { get; private set; }
    public JournalEntry? JournalEntry { get; private set; }
    public int LineNumber { get; private set; }
    public Guid AccountId { get; private set; }
    public Account? Account { get; private set; }
    public decimal Debit { get; private set; }
    public decimal Credit { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public Guid? CostCenterId { get; private set; }
    public CostCenter? CostCenter { get; private set; }

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private JournalEntryLine() { }

    public static JournalEntryLine Create(
        Guid tenantId,
        Guid companyId,
        Guid journalEntryId,
        int lineNumber,
        Guid accountId,
        decimal debit,
        decimal credit,
        string description,
        Guid? costCenterId = null)
    {
        if (debit < 0 || credit < 0)
        {
            throw new ArgumentException("قيمة المدين أو الدائن لا يمكن أن تكون سالبة");
        }

        if (debit > 0 && credit > 0)
        {
            throw new ArgumentException("لا يمكن أن يحتوي سطر القيد على مدين ودائن معاً");
        }

        if (debit == 0 && credit == 0)
        {
            throw new ArgumentException("يجب أن يحتوي سطر القيد على قيمة مدين أو دائن أكبر من صفر");
        }

        return new JournalEntryLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            JournalEntryId = journalEntryId,
            LineNumber = lineNumber,
            AccountId = accountId,
            Debit = Math.Round(debit, 4),
            Credit = Math.Round(credit, 4),
            Description = description.Trim(),
            CostCenterId = costCenterId,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
