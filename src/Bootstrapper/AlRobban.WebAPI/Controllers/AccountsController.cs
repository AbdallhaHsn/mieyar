using AlRobban.Modules.GeneralLedger.Application.Commands.CreateAccount;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountingStandards;
using AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountsTree;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AccountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع شجرة دليل الحسابات الهرمية للشركة مع المعايير المحاسبية والقيود النموذجية
    /// </summary>
    [HttpGet("tree")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccountsTree([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAccountsTreeQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع قائمة المعايير الدولية والوطنية (IFRS / SOCPA / ZATCA) وشروحها والقيود النموذجية
    /// </summary>
    [HttpGet("standards")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountingStandardGuidance>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStandards(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAccountingStandardsQuery(), cancellationToken);
        return Ok(result.Value);
    }

    /// <summary>
    /// إضافة حساب جديد في شجرة الحسابات مع ربطه بالمعيار والطرف المحاسبي
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetAccountsTree), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// تعديل وإعادة تسمية حساب في شجرة الحسابات
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAccount(
        [FromRoute] Guid id,
        [FromBody] UpdateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AlRobban.Modules.GeneralLedger.Application.Commands.UpdateAccount.UpdateAccountCommand(
            id,
            request.NameAr,
            request.NameEn,
            request.Description,
            request.IsActive,
            request.StandardCode
        );

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// حذف حساب من شجرة الحسابات (شريطة عدم وجود حسابات فرعية أو قيود مرتبطة)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAccount([FromRoute] Guid id, [FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AlRobban.Modules.GeneralLedger.Application.Commands.DeleteAccount.DeleteAccountCommand(id, companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return NoContent();
    }

    /// <summary>
    /// تصدير شجرة دليل الحسابات إلى ملف CSV متوافق مع Excel واللغة العربية
    /// </summary>
    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ExportAccountsCsvQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return File(result.Value.FileBytes, result.Value.ContentType, result.Value.FileName);
    }

    /// <summary>
    /// استيراد شجرة أو بنود دليل الحسابات دفعة واحدة من ملف أو نص CSV
    /// </summary>
    [HttpPost("import-csv")]
    public async Task<IActionResult> ImportCsv([FromBody] ImportAccountsCsvRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ImportAccountsFromCsvCommand(request.CsvContent, request.CompanyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
}

public record ImportAccountsCsvRequest(
    string CsvContent,
    Guid? CompanyId = null
);

public record UpdateAccountRequest(
    string NameAr,
    string NameEn,
    string? Description = null,
    bool IsActive = true,
    string? StandardCode = null
);

