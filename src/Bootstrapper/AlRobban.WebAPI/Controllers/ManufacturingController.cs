using AlRobban.Modules.Manufacturing.Application.Commands;
using AlRobban.Modules.Manufacturing.Application.DTOs;
using AlRobban.Modules.Manufacturing.Application.Queries;
using AlRobban.Modules.Manufacturing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ManufacturingController : ControllerBase
{
    private readonly IMediator _mediator;

    public ManufacturingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // 1. Metrics
    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics([FromQuery] Guid? companyId)
    {
        var result = await _mediator.Send(new GetManufacturingMetricsQuery(companyId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    // 2. Bill of Materials (BOM)
    [HttpGet("boms")]
    public async Task<IActionResult> GetBoms([FromQuery] Guid? companyId, [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetBomsQuery(companyId, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("boms/{id:guid}")]
    public async Task<IActionResult> GetBomById(Guid id)
    {
        var result = await _mediator.Send(new GetBomByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost("boms")]
    public async Task<IActionResult> CreateBom([FromBody] CreateBomCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPut("boms/{id:guid}")]
    public async Task<IActionResult> UpdateBom(Guid id, [FromBody] UpdateBomCommand command)
    {
        if (id != command.Id) return BadRequest("معرف شجرة المنتج غير متطابق");
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("boms/{id:guid}")]
    public async Task<IActionResult> DeleteBom(Guid id)
    {
        var result = await _mediator.Send(new DeleteBomCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(result.Error);
    }

    // 3. Work Orders
    [HttpGet("work-orders")]
    public async Task<IActionResult> GetWorkOrders([FromQuery] Guid? companyId, [FromQuery] string? status, [FromQuery] string? search)
    {
        WorkOrderStatus? statusEnum = null;
        if (!string.IsNullOrWhiteSpace(status) && status != "all" && Enum.TryParse<WorkOrderStatus>(status, true, out var parsed))
        {
            statusEnum = parsed;
        }

        var result = await _mediator.Send(new GetWorkOrdersQuery(companyId, statusEnum, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("work-orders/{id:guid}")]
    public async Task<IActionResult> GetWorkOrderById(Guid id)
    {
        var result = await _mediator.Send(new GetWorkOrderByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost("work-orders")]
    public async Task<IActionResult> CreateWorkOrder([FromBody] CreateWorkOrderCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPut("work-orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateWorkOrderStatus(Guid id, [FromBody] UpdateWorkOrderStatusRequest request)
    {
        if (!Enum.TryParse<WorkOrderStatus>(request.Status, true, out var statusEnum))
            return BadRequest("حالة أمر التشغيل غير صالحة");

        var result = await _mediator.Send(new UpdateWorkOrderStatusCommand(id, statusEnum, request.CompletedQuantity, request.RejectedQuantity, request.Notes));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("work-orders/{id:guid}")]
    public async Task<IActionResult> DeleteWorkOrder(Guid id)
    {
        var result = await _mediator.Send(new DeleteWorkOrderCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(result.Error);
    }

    // 4. Workstations
    [HttpGet("workstations")]
    public async Task<IActionResult> GetWorkstations([FromQuery] Guid? companyId, [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetWorkstationsQuery(companyId, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("workstations")]
    public async Task<IActionResult> CreateWorkstation([FromBody] CreateWorkstationCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("workstations/{id:guid}")]
    public async Task<IActionResult> DeleteWorkstation(Guid id)
    {
        var result = await _mediator.Send(new DeleteWorkstationCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(result.Error);
    }

    // 5. Raw Materials
    [HttpGet("raw-materials")]
    public async Task<IActionResult> GetRawMaterials([FromQuery] Guid? companyId, [FromQuery] string? category, [FromQuery] string? search)
    {
        RawMaterialCategory? catEnum = null;
        if (!string.IsNullOrWhiteSpace(category) && category != "all" && Enum.TryParse<RawMaterialCategory>(category, true, out var parsed))
        {
            catEnum = parsed;
        }

        var result = await _mediator.Send(new GetRawMaterialsQuery(companyId, catEnum, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("raw-materials")]
    public async Task<IActionResult> CreateRawMaterial([FromBody] CreateRawMaterialCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("raw-materials/{id:guid}")]
    public async Task<IActionResult> DeleteRawMaterial(Guid id)
    {
        var result = await _mediator.Send(new DeleteRawMaterialCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(result.Error);
    }
}

public record UpdateWorkOrderStatusRequest(
    string Status,
    decimal? CompletedQuantity,
    decimal? RejectedQuantity,
    string? Notes);
