using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.DocumentManagement.Application.Entities;

public class DocumentAttachment : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string EntityType { get; private set; } = string.Empty; // "JournalEntry", "Voucher", "Invoice", "FixedAsset", etc.
    public Guid EntityId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = "application/octet-stream";
    public long FileSizeBytes { get; private set; }
    public string FileContentBase64 { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsDeleted { get; private set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private DocumentAttachment() { }

    public static DocumentAttachment Create(
        Guid tenantId,
        Guid companyId,
        string entityType,
        Guid entityId,
        string fileName,
        string contentType,
        long fileSizeBytes,
        string fileContentBase64,
        string? description,
        string? uploadedBy)
    {
        return new DocumentAttachment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            EntityType = entityType.Trim(),
            EntityId = entityId,
            FileName = fileName.Trim(),
            ContentType = contentType.Trim(),
            FileSizeBytes = fileSizeBytes,
            FileContentBase64 = fileContentBase64,
            Description = description,
            CreatedBy = uploadedBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void SoftDelete(string? user)
    {
        IsDeleted = true;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }
}
