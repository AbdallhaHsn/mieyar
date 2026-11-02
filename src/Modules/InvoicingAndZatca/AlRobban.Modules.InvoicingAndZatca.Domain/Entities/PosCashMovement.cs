using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

public class PosCashMovement : Entity<Guid>
{
    public Guid PosShiftId { get; private set; }
    public CashMovementType MovementType { get; private set; }
    public decimal Amount { get; private set; }
    public string ReasonAr { get; private set; } = string.Empty;
    public string ReasonEn { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public string? CreatedBy { get; private set; }

    private PosCashMovement() { }

    public static PosCashMovement Create(
        Guid shiftId,
        CashMovementType movementType,
        decimal amount,
        string reasonAr,
        string? reasonEn = null,
        string? createdBy = null)
    {
        return new PosCashMovement
        {
            Id = Guid.NewGuid(),
            PosShiftId = shiftId,
            MovementType = movementType,
            Amount = Math.Abs(amount),
            ReasonAr = reasonAr.Trim(),
            ReasonEn = string.IsNullOrWhiteSpace(reasonEn) ? reasonAr.Trim() : reasonEn.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }
}
