using AlRobban.Modules.GeneralLedger.Application.Commands.FixedAssets;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.FixedAssets;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/fixed-assets")]
public class FixedAssetsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FixedAssetsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع سجل الأصول الثابتة للشركة مع مؤشرات الإهلاك والرصيد الدفتري
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<FixedAssetDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] FixedAssetStatus? status,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetFixedAssetsQuery(companyId, status, searchTerm), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تسجيل أصل ثابت جديد في النظام
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(FixedAssetDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        [FromBody] CreateFixedAssetRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CreateFixedAssetCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetList), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// معاينة الإهلاك الشهري المستحق قبل الترحيل
    /// </summary>
    [HttpGet("depreciation-preview")]
    [ProducesResponseType(typeof(DepreciationPreviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PreviewDepreciation(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? targetDate,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDepreciationPreviewQuery(companyId, targetDate), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تشغيل الإهلاك الشهري وتوليد قيد اليومية الآلي المعتمد
    /// </summary>
    [HttpPost("run-depreciation")]
    [ProducesResponseType(typeof(RunDepreciationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunDepreciation(
        [FromBody] RunDepreciationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RunDepreciationCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استبعاد أو بيع أصل ثابت، وتوليد قيد إقفال الأصل ومجمع الإهلاك والأرباح/الخسائر الرأسمالية آلياً
    /// </summary>
    [HttpPost("{id:guid}/dispose")]
    [ProducesResponseType(typeof(DisposeFixedAssetResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DisposeAsset(
        [FromRoute] Guid id,
        [FromBody] DisposeFixedAssetRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DisposeFixedAssetCommand(id, request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}
