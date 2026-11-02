using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class ProjectPhase : Entity<Guid>, IAuditableEntity
{
    public Guid ProjectId { get; private set; }
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public int PhaseOrder { get; private set; } = 1;
    public DateTime? StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public decimal EstimatedCost { get; private set; }
    public decimal WeightPercentage { get; private set; } // نسبة وزن المرحلة من المشروع %
    public decimal CompletionPercentage { get; private set; } // نسبة الإنجاز %
    public string Status { get; private set; } = "Active"; // Active, Completed, Pending
    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private ProjectPhase() { }

    public ProjectPhase(
        Guid id,
        Guid projectId,
        string nameAr,
        string nameEn,
        int phaseOrder,
        DateTime? startDate,
        DateTime? endDate,
        decimal estimatedCost,
        decimal weightPercentage,
        string? notes = null)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        ProjectId = projectId;
        NameAr = nameAr;
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn;
        PhaseOrder = phaseOrder;
        StartDate = startDate;
        EndDate = endDate;
        EstimatedCost = Math.Max(0, estimatedCost);
        WeightPercentage = Math.Clamp(weightPercentage, 0, 100);
        CompletionPercentage = 0;
        Status = "Active";
        Notes = notes;
    }

    public void UpdateProgress(decimal completionPercentage, string? status = null)
    {
        CompletionPercentage = Math.Clamp(completionPercentage, 0, 100);
        if (CompletionPercentage >= 100)
        {
            Status = "Completed";
        }
        else if (!string.IsNullOrWhiteSpace(status))
        {
            Status = status;
        }
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        decimal estimatedCost,
        decimal weightPercentage,
        DateTime? startDate,
        DateTime? endDate,
        string? notes)
    {
        NameAr = nameAr;
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn;
        EstimatedCost = Math.Max(0, estimatedCost);
        WeightPercentage = Math.Clamp(weightPercentage, 0, 100);
        StartDate = startDate;
        EndDate = endDate;
        Notes = notes;
    }
}
