using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/journal-entries")]
public class JournalEntriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public JournalEntriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة قيود اليومية مع المؤشرات المالية وفلاتر البحث
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(JournalEntriesListResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] JournalEntryStatus? status,
        [FromQuery] string? searchTerm,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = new GetJournalEntriesQuery(companyId, fromDate, toDate, status, searchTerm, skip, take);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل قيد يومية كامل مع كافة أسطره وأطرافه المحاسبية
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(JournalEntryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetJournalEntryByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء قيد يومية جديد (مسودة أو ترحيل فوري بعد التحقق من التوازن والفترة المالية)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(JournalEntryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateJournalEntryCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// ترحيل قيد يومية مسودة والتأثير الفوري على أرصدة شجرة الحسابات
    /// </summary>
    [HttpPost("{id:guid}/post")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post([FromRoute] Guid id, [FromBody] PostJournalEntryRequest? request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new PostJournalEntryCommand(id, request?.PostedBy), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(new { success = true, message = "تم ترحيل القيد وتحديث أرصدة شجرة الحسابات بنجاح" });
    }

    /// <summary>
    /// إنشاء قيد عكسي لقيد مرحّل لإلغائه مع توثيق سبب الإلغاء في سجل التدقيق
    /// </summary>
    [HttpPost("{id:guid}/reverse")]
    [ProducesResponseType(typeof(JournalEntryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reverse([FromRoute] Guid id, [FromBody] ReverseJournalEntryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { error = "سبب الإلغاء إلزامي لإنشاء قيد عكسي" });
        }

        var result = await _mediator.Send(new ReverseJournalEntryCommand(id, request.Reason, request.ReversedBy), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع قوالب القيود الدورية المتكررة للشركة
    /// </summary>
    [HttpGet("recurring")]
    [ProducesResponseType(typeof(List<RecurringEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecurringEntries([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries.GetRecurringJournalEntriesQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء قالب قيد دوري متكرر جديد (إيجارات، رواتب، مصاريف دورية)
    /// </summary>
    [HttpPost("recurring")]
    [ProducesResponseType(typeof(RecurringEntryDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateRecurringEntry([FromBody] CreateRecurringEntryRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries.CreateRecurringJournalEntryCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تشغيل القيد الدوري يدوياً أو آلياً وتوليد قيد اليومية الفعلي في دفتر الأستاذ العام
    /// </summary>
    [HttpPost("recurring/{id:guid}/execute")]
    [ProducesResponseType(typeof(ExecuteRecurringEntryResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExecuteRecurringEntry([FromRoute] Guid id, [FromQuery] DateTime? executionDate, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries.ExecuteRecurringJournalEntryCommand(id, executionDate), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record PostJournalEntryRequest(string? PostedBy);
public record ReverseJournalEntryRequest(string Reason, string? ReversedBy);
