using AlRobban.Modules.DocumentManagement.Application.Commands;
using AlRobban.Modules.DocumentManagement.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DocumentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// رفع وحفظ مستند أو مرفق مؤيد لقيد أو سند أو فاتورة أو أصل
    /// </summary>
    [HttpPost("upload")]
    [ProducesResponseType(typeof(DocumentAttachmentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload([FromBody] UploadDocumentRequest request, CancellationToken cancellationToken)
    {
        var command = new UploadDocumentCommand(
            request.CompanyId,
            request.EntityType,
            request.EntityId,
            request.FileName,
            request.ContentType,
            request.FileContentBase64,
            request.Description
        );

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع قائمة المستندات والمرفقات المرتبطة بسجل محدد (قيد/سند/فاتورة)
    /// </summary>
    [HttpGet("{entityType}/{entityId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<DocumentAttachmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByEntity(
        [FromRoute] string entityType,
        [FromRoute] Guid entityId,
        [FromQuery] Guid? companyId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDocumentsByEntityQuery(companyId, entityType, entityId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// تحميل محتوى المستند أو المرفق الأصلي
    /// </summary>
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDocumentFileByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }

        return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
    }

    /// <summary>
    /// حذف مستند أو مرفق
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteDocumentCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return NoContent();
    }
}
