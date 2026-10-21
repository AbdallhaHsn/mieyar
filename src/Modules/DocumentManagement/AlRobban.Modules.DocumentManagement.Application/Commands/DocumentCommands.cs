using AlRobban.Modules.DocumentManagement.Application.DTOs;
using AlRobban.Modules.DocumentManagement.Application.Entities;
using AlRobban.Modules.DocumentManagement.Application.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.DocumentManagement.Application.Commands;

public record UploadDocumentCommand(
    Guid? CompanyId,
    string EntityType,
    Guid EntityId,
    string FileName,
    string ContentType,
    string FileContentBase64,
    string? Description = null
) : IRequest<Result<DocumentAttachmentDto>>;

public class UploadDocumentCommandHandler : IRequestHandler<UploadDocumentCommand, Result<DocumentAttachmentDto>>
{
    private readonly IDocumentRepository _documentRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public UploadDocumentCommandHandler(
        IDocumentRepository documentRepository,
        ICurrentTenantContext tenantContext)
    {
        _documentRepository = documentRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<DocumentAttachmentDto>> Handle(UploadDocumentCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        if (string.IsNullOrWhiteSpace(request.FileName) || string.IsNullOrWhiteSpace(request.FileContentBase64))
        {
            return Result.Failure<DocumentAttachmentDto>(Error.Validation("Document.Empty", "اسم الملف ومحتواه بصيغة Base64 مطلوبان."));
        }

        // Calculate approximate byte size from Base64
        var rawBase64 = request.FileContentBase64.Contains(",") 
            ? request.FileContentBase64.Substring(request.FileContentBase64.IndexOf(",") + 1)
            : request.FileContentBase64;

        long sizeBytes = (long)(rawBase64.Length * 0.75);

        var doc = DocumentAttachment.Create(
            tenantId: tenantId,
            companyId: companyId,
            entityType: request.EntityType,
            entityId: request.EntityId,
            fileName: request.FileName,
            contentType: request.ContentType,
            fileSizeBytes: sizeBytes,
            fileContentBase64: rawBase64,
            description: request.Description,
            uploadedBy: "System User"
        );

        await _documentRepository.AddAsync(doc, cancellationToken);
        await _documentRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(DocumentAttachmentDto.FromEntity(doc));
    }
}

public record GetDocumentsByEntityQuery(Guid? CompanyId, string EntityType, Guid EntityId) : IRequest<Result<IReadOnlyList<DocumentAttachmentDto>>>;

public class GetDocumentsByEntityQueryHandler : IRequestHandler<GetDocumentsByEntityQuery, Result<IReadOnlyList<DocumentAttachmentDto>>>
{
    private readonly IDocumentRepository _documentRepository;

    public GetDocumentsByEntityQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<IReadOnlyList<DocumentAttachmentDto>>> Handle(GetDocumentsByEntityQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");
        var docs = await _documentRepository.GetByEntityAsync(companyId, request.EntityType, request.EntityId, cancellationToken);
        var dtos = docs.Select(DocumentAttachmentDto.FromEntity).ToList();
        return Result.Success<IReadOnlyList<DocumentAttachmentDto>>(dtos);
    }
}

public record GetDocumentFileByIdQuery(Guid Id) : IRequest<Result<DocumentFileDownloadDto>>;

public record DocumentFileDownloadDto(string FileName, string ContentType, byte[] Bytes);

public class GetDocumentFileByIdQueryHandler : IRequestHandler<GetDocumentFileByIdQuery, Result<DocumentFileDownloadDto>>
{
    private readonly IDocumentRepository _documentRepository;

    public GetDocumentFileByIdQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<DocumentFileDownloadDto>> Handle(GetDocumentFileByIdQuery request, CancellationToken cancellationToken)
    {
        var doc = await _documentRepository.GetByIdAsync(request.Id, cancellationToken);
        if (doc == null || doc.IsDeleted)
        {
            return Result.Failure<DocumentFileDownloadDto>(Error.NotFound("Document.NotFound", "المستند المطلوب غير موجود."));
        }

        try
        {
            var bytes = Convert.FromBase64String(doc.FileContentBase64);
            return Result.Success(new DocumentFileDownloadDto(doc.FileName, doc.ContentType, bytes));
        }
        catch
        {
            return Result.Failure<DocumentFileDownloadDto>(Error.Failure("Document.Corrupted", "تعذر فك تشفير محتوى المستند."));
        }
    }
}

public record DeleteDocumentCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteDocumentCommandHandler : IRequestHandler<DeleteDocumentCommand, Result<bool>>
{
    private readonly IDocumentRepository _documentRepository;

    public DeleteDocumentCommandHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<bool>> Handle(DeleteDocumentCommand request, CancellationToken cancellationToken)
    {
        var doc = await _documentRepository.GetByIdAsync(request.Id, cancellationToken);
        if (doc == null || doc.IsDeleted)
        {
            return Result.Failure<bool>(Error.NotFound("Document.NotFound", "المستند غير موجود."));
        }

        doc.SoftDelete("System User");
        await _documentRepository.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
