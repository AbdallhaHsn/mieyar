using AlRobban.Modules.DocumentManagement.Application.Entities;

namespace AlRobban.Modules.DocumentManagement.Application.DTOs;

public record DocumentAttachmentDto(
    Guid Id,
    Guid CompanyId,
    string EntityType,
    Guid EntityId,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string? Description,
    string? UploadedBy,
    DateTime UploadedAtUtc
)
{
    public static DocumentAttachmentDto FromEntity(DocumentAttachment doc) => new(
        doc.Id,
        doc.CompanyId,
        doc.EntityType,
        doc.EntityId,
        doc.FileName,
        doc.ContentType,
        doc.FileSizeBytes,
        doc.Description,
        doc.CreatedBy,
        doc.CreatedAtUtc
    );
}

public record UploadDocumentRequest(
    Guid? CompanyId,
    string EntityType,
    Guid EntityId,
    string FileName,
    string ContentType,
    string FileContentBase64,
    string? Description = null
);
