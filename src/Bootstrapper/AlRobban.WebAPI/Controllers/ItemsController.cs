using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.Purchasing.Application.Commands.Items;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Application.Queries;
using AlRobban.Modules.Purchasing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/items")]
public class ItemsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة الأصناف مع إمكانية البحث والفلترة حسب النوع والحالة
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] ItemType? itemType,
        [FromQuery] string? searchTerm,
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetItemsQuery(companyId, itemType, searchTerm, activeOnly), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل صنف بواسطة المعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetItemByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع سجل وحركة المخزون للصنف (كارت الصنف)
    /// </summary>
    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(typeof(List<InventoryTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetItemInventoryHistoryQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع سجل وحركات المخزون العامة (التسويات، التحويلات، الجرد) مع فلترة المستودع
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(typeof(List<InventoryTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? itemId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] string? warehouseCode,
        [FromQuery] InventoryMovementType? movementType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllInventoryTransactionsQuery(companyId, itemId, warehouseId, warehouseCode, movementType, fromDate, toDate), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع أرصدة الأصناف موزعة حسب المستودعات ومواقع الأرفف
    /// </summary>
    [HttpGet("warehouse-stocks")]
    [ProducesResponseType(typeof(List<ItemWarehouseStockDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWarehouseStocks(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? itemId,
        [FromQuery] Guid? warehouseId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetItemWarehouseStocksQuery(companyId, itemId, warehouseId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إضافة صنف جديد
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpPost]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateItemCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// تحديث بيانات الصنف
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateItemRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateItemCommand(
            id,
            request.NameAr,
            request.NameEn,
            request.ItemType,
            request.UnitOfMeasure,
            request.PurchasePrice,
            request.SalePrice,
            request.Barcode,
            request.InventoryAccountId,
            request.CogsAccountId,
            request.RevenueAccountId,
            request.MinStockLevel,
            request.IsActive);

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إجراء تسوية جردية للمخزون الفعلي وتوليد حركة المخزون والقيد المحاسبي آلياً
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpPost("{id:guid}/adjust-stock")]
    [ProducesResponseType(typeof(AdjustStockResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AdjustStock(
        [FromRoute] Guid id,
        [FromBody] AdjustStockRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AdjustStockCommand(
            id,
            request.ActualQuantity,
            request.WarehouseCode,
            request.ReasonAr,
            request.ReasonEn,
            User.Identity?.Name ?? "أمين المستودع");

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تحويل مخزني بين الفروع والمستودعات
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpPost("{id:guid}/transfer-stock")]
    [ProducesResponseType(typeof(TransferStockResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> TransferStock(
        [FromRoute] Guid id,
        [FromBody] TransferStockRequest request,
        CancellationToken cancellationToken)
    {
        var command = new TransferStockCommand(
            id,
            request.SourceWarehouseCode,
            request.DestinationWarehouseCode,
            request.Quantity,
            request.ReasonAr,
            request.ReasonEn,
            User.Identity?.Name ?? "مسؤول المستودع");

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// ترحيل محضر جرد مستودع مجمع وتوليد القيد المحاسبي المتوازن آلياً
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpPost("inventory-audit")]
    [ProducesResponseType(typeof(PostInventoryAuditResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PostInventoryAudit(
        [FromBody] PostInventoryAuditRequest request,
        CancellationToken cancellationToken)
    {
        var command = new PostInventoryAuditCommand(request, User.Identity?.Name ?? "لجنة الجرد والمستودعات");
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// حذف صنف (إذا لم يكن لديه رصيد مخزني)
    /// </summary>
    [Authorize(Roles = AppRoles.BackOffice)]
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteItemCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(new { success = true, message = "تم حذف الصنف بنجاح" });
    }
}

public record AdjustStockRequest(
    decimal ActualQuantity,
    string? WarehouseCode,
    string ReasonAr,
    string? ReasonEn
);

public record TransferStockRequest(
    string SourceWarehouseCode,
    string DestinationWarehouseCode,
    decimal Quantity,
    string ReasonAr,
    string? ReasonEn
);

public record UpdateItemRequest(
    string NameAr,
    string NameEn,
    ItemType ItemType,
    string UnitOfMeasure,
    decimal PurchasePrice,
    decimal SalePrice,
    string? Barcode = null,
    Guid? InventoryAccountId = null,
    Guid? CogsAccountId = null,
    Guid? RevenueAccountId = null,
    decimal MinStockLevel = 0,
    bool IsActive = true
);

