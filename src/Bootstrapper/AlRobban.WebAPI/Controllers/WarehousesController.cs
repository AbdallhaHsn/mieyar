using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/companies/{companyId:guid}/warehouses")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly PurchasingDbContext _dbContext;
    private readonly ICurrentTenantContext _tenantContext;

    public WarehousesController(PurchasingDbContext dbContext, ICurrentTenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetWarehouses(Guid companyId, CancellationToken cancellationToken)
    {
        var warehouses = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .Where(w => w.CompanyId == companyId)
            .OrderBy(w => w.Code)
            .ToListAsync(cancellationToken);

        // Auto-seed default warehouse if company has none
        if (warehouses.Count == 0)
        {
            var defaultWh = new Warehouse(
                Guid.NewGuid(),
                companyId,
                companyId,
                code: "WH-MAIN",
                nameAr: "المستودع الرئيسي (الإدارة)",
                nameEn: "Main Central Warehouse",
                branchId: null,
                branchName: "الفرع الرئيسي",
                location: "الرياض - المقر الرئيسي",
                managerName: "أمين المستودع العام",
                managerPhone: null,
                isDefault: true);

            await _dbContext.Warehouses.AddAsync(defaultWh, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            warehouses.Add(defaultWh);
        }

        var dtos = warehouses.Select(w => new
        {
            w.Id,
            w.CompanyId,
            w.BranchId,
            w.BranchName,
            w.Code,
            w.NameAr,
            w.NameEn,
            w.Location,
            w.ManagerName,
            w.ManagerPhone,
            w.IsDefault,
            w.IsActive,
            w.CreatedAtUtc
        }).ToList();

        return Ok(dtos);
    }

    [HttpPost]
    public async Task<IActionResult> CreateWarehouse(Guid companyId, [FromBody] CreateWarehouseRequest request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToUpper();
        var exists = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .AnyAsync(w => w.CompanyId == companyId && w.Code == code, cancellationToken);

        if (exists)
        {
            return Conflict(new { code = "Warehouse.DuplicateCode", description = $"كود المستودع '{code}' مسجل مسبقاً لهذه الشركة." });
        }

        // If this warehouse is marked as default, unset other defaults
        if (request.IsDefault)
        {
            var existingDefaults = await _dbContext.Warehouses
                .IgnoreQueryFilters()
                .Where(w => w.CompanyId == companyId && w.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var ed in existingDefaults)
            {
                ed.SetDefault(false);
            }
        }

        var warehouse = new Warehouse(
            Guid.NewGuid(),
            companyId,
            companyId,
            code: code,
            nameAr: request.NameAr.Trim(),
            nameEn: request.NameEn.Trim(),
            branchId: request.BranchId,
            branchName: request.BranchName?.Trim(),
            location: request.Location?.Trim(),
            managerName: request.ManagerName?.Trim(),
            managerPhone: request.ManagerPhone?.Trim(),
            isDefault: request.IsDefault);

        await _dbContext.Warehouses.AddAsync(warehouse, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/companies/{companyId}/warehouses/{warehouse.Id}", new
        {
            warehouse.Id,
            warehouse.CompanyId,
            warehouse.BranchId,
            warehouse.BranchName,
            warehouse.Code,
            warehouse.NameAr,
            warehouse.NameEn,
            warehouse.Location,
            warehouse.ManagerName,
            warehouse.ManagerPhone,
            warehouse.IsDefault,
            warehouse.IsActive,
            warehouse.CreatedAtUtc
        });
    }

    [HttpPut("{warehouseId:guid}/status")]
    public async Task<IActionResult> ToggleWarehouseStatus(Guid companyId, Guid warehouseId, [FromBody] ToggleWarehouseStatusRequest request, CancellationToken cancellationToken)
    {
        var warehouse = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Id == warehouseId, cancellationToken);

        if (warehouse == null)
        {
            return NotFound(new { code = "Warehouse.NotFound", description = "المستودع غير موجود." });
        }

        if (request.IsActive)
        {
            warehouse.Activate();
        }
        else
        {
            if (warehouse.IsDefault)
            {
                return BadRequest(new { code = "Warehouse.CannotDeactivateDefault", description = "لا يمكن تعطيل المستودع الافتراضي للمنشأة." });
            }
            warehouse.Deactivate();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { warehouseId, isActive = warehouse.IsActive });
    }

    [HttpPut("{warehouseId:guid}")]
    public async Task<IActionResult> UpdateWarehouse(Guid companyId, Guid warehouseId, [FromBody] UpdateWarehouseRequest request, CancellationToken cancellationToken)
    {
        var warehouse = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Id == warehouseId, cancellationToken);

        if (warehouse == null)
        {
            return NotFound(new { code = "Warehouse.NotFound", description = "المستودع غير موجود." });
        }

        // If this warehouse is being set to default, unset other defaults
        if (request.IsDefault && !warehouse.IsDefault)
        {
            var existingDefaults = await _dbContext.Warehouses
                .IgnoreQueryFilters()
                .Where(w => w.CompanyId == companyId && w.IsDefault && w.Id != warehouseId)
                .ToListAsync(cancellationToken);

            foreach (var ed in existingDefaults)
            {
                ed.SetDefault(false);
            }
        }

        warehouse.UpdateDetails(
            nameAr: request.NameAr.Trim(),
            nameEn: request.NameEn.Trim(),
            branchId: request.BranchId,
            branchName: request.BranchName?.Trim(),
            location: request.Location?.Trim(),
            managerName: request.ManagerName?.Trim(),
            managerPhone: request.ManagerPhone?.Trim(),
            isDefault: request.IsDefault);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            warehouse.Id,
            warehouse.CompanyId,
            warehouse.BranchId,
            warehouse.BranchName,
            warehouse.Code,
            warehouse.NameAr,
            warehouse.NameEn,
            warehouse.Location,
            warehouse.ManagerName,
            warehouse.ManagerPhone,
            warehouse.IsDefault,
            warehouse.IsActive
        });
    }

    [HttpDelete("{warehouseId:guid}")]
    public async Task<IActionResult> DeleteWarehouse(Guid companyId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var warehouse = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Id == warehouseId, cancellationToken);

        if (warehouse == null)
        {
            return NotFound(new { code = "Warehouse.NotFound", description = "المستودع غير موجود." });
        }

        if (warehouse.IsDefault)
        {
            return BadRequest(new { code = "Warehouse.CannotDeleteDefault", description = "لا يمكن حذف المستودع الافتراضي للمنشأة." });
        }

        _dbContext.Warehouses.Remove(warehouse);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "تم حذف المستودع بنجاح." });
    }

    [HttpGet("{warehouseId:guid}/accounting-matrix")]
    public async Task<IActionResult> GetAccountingMatrix(Guid companyId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var mappings = await _dbContext.WarehouseAccountMappings
            .IgnoreQueryFilters()
            .Where(m => m.CompanyId == companyId && m.WarehouseId == warehouseId)
            .OrderBy(m => m.PaymentMethod)
            .ToListAsync(cancellationToken);

        return Ok(mappings);
    }

    [HttpPut("{warehouseId:guid}/accounting-matrix/{paymentMethod:int}")]
    public async Task<IActionResult> SaveAccountingMatrix(
        Guid companyId,
        Guid warehouseId,
        int paymentMethod,
        [FromBody] SaveWarehouseAccountMappingRequest request,
        CancellationToken cancellationToken)
    {
        var warehouse = await _dbContext.Warehouses
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Id == warehouseId, cancellationToken);

        if (warehouse == null)
        {
            return NotFound(new { code = "Warehouse.NotFound", description = "المستودع غير موجود." });
        }

        var mapping = await _dbContext.WarehouseAccountMappings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.WarehouseId == warehouseId && m.PaymentMethod == paymentMethod, cancellationToken);

        if (mapping == null)
        {
            mapping = new WarehouseAccountMapping(
                Guid.NewGuid(),
                warehouse.TenantId,
                companyId,
                warehouseId,
                paymentMethod);

            await _dbContext.WarehouseAccountMappings.AddAsync(mapping, cancellationToken);
        }

        mapping.UpdateAccounts(
            request.SalesInvoiceAccountId, request.SalesInvoiceAccountCode, request.SalesInvoiceAccountName,
            request.InventoryAccountId, request.InventoryAccountCode, request.InventoryAccountName,
            request.CogsAccountId, request.CogsAccountCode, request.CogsAccountName,
            request.SalesRevenueAccountId, request.SalesRevenueAccountCode, request.SalesRevenueAccountName,
            request.SalesReturnAccountId, request.SalesReturnAccountCode, request.SalesReturnAccountName,
            request.AdvancePaymentAccountId, request.AdvancePaymentAccountCode, request.AdvancePaymentAccountName,
            request.DiscountAllowedAccountId, request.DiscountAllowedAccountCode, request.DiscountAllowedAccountName,
            request.TaxAccountId, request.TaxAccountCode, request.TaxAccountName,
            request.ServicesRevenueAccountId, request.ServicesRevenueAccountCode, request.ServicesRevenueAccountName,
            request.ServicesCostAccountId, request.ServicesCostAccountCode, request.ServicesCostAccountName,
            request.LoyaltyCustomersAccountId, request.LoyaltyCustomersAccountCode, request.LoyaltyCustomersAccountName,
            request.RoundingAccountId, request.RoundingAccountCode, request.RoundingAccountName,
            request.AdditionalExpensesAccountId, request.AdditionalExpensesAccountCode, request.AdditionalExpensesAccountName,
            request.TransferClearingAccountId, request.TransferClearingAccountCode, request.TransferClearingAccountName,
            request.AdjustmentVarianceAccountId, request.AdjustmentVarianceAccountCode, request.AdjustmentVarianceAccountName,
            User.Identity?.Name ?? "المستخدم");

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(mapping);
    }

    [HttpPost("{warehouseId:guid}/accounting-matrix/copy")]
    public async Task<IActionResult> CopyAccountingMatrix(
        Guid companyId,
        Guid warehouseId,
        [FromBody] CopyWarehouseAccountMappingRequest request,
        CancellationToken cancellationToken)
    {
        var source = await _dbContext.WarehouseAccountMappings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.WarehouseId == request.SourceWarehouseId && m.PaymentMethod == request.SourcePaymentMethod, cancellationToken);

        if (source == null)
        {
            return NotFound(new { code = "Mapping.SourceNotFound", description = "التهيئة المصدر غير موجودة لنسخها." });
        }

        var target = await _dbContext.WarehouseAccountMappings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.WarehouseId == warehouseId && m.PaymentMethod == request.TargetPaymentMethod, cancellationToken);

        if (target == null)
        {
            target = new WarehouseAccountMapping(
                Guid.NewGuid(),
                source.TenantId,
                companyId,
                warehouseId,
                request.TargetPaymentMethod);

            await _dbContext.WarehouseAccountMappings.AddAsync(target, cancellationToken);
        }

        target.UpdateAccounts(
            source.SalesInvoiceAccountId, source.SalesInvoiceAccountCode, source.SalesInvoiceAccountName,
            source.InventoryAccountId, source.InventoryAccountCode, source.InventoryAccountName,
            source.CogsAccountId, source.CogsAccountCode, source.CogsAccountName,
            source.SalesRevenueAccountId, source.SalesRevenueAccountCode, source.SalesRevenueAccountName,
            source.SalesReturnAccountId, source.SalesReturnAccountCode, source.SalesReturnAccountName,
            source.AdvancePaymentAccountId, source.AdvancePaymentAccountCode, source.AdvancePaymentAccountName,
            source.DiscountAllowedAccountId, source.DiscountAllowedAccountCode, source.DiscountAllowedAccountName,
            source.TaxAccountId, source.TaxAccountCode, source.TaxAccountName,
            source.ServicesRevenueAccountId, source.ServicesRevenueAccountCode, source.ServicesRevenueAccountName,
            source.ServicesCostAccountId, source.ServicesCostAccountCode, source.ServicesCostAccountName,
            source.LoyaltyCustomersAccountId, source.LoyaltyCustomersAccountCode, source.LoyaltyCustomersAccountName,
            source.RoundingAccountId, source.RoundingAccountCode, source.RoundingAccountName,
            source.AdditionalExpensesAccountId, source.AdditionalExpensesAccountCode, source.AdditionalExpensesAccountName,
            source.TransferClearingAccountId, source.TransferClearingAccountCode, source.TransferClearingAccountName,
            source.AdjustmentVarianceAccountId, source.AdjustmentVarianceAccountCode, source.AdjustmentVarianceAccountName,
            User.Identity?.Name ?? "المستخدم");

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(target);
    }
}

public record SaveWarehouseAccountMappingRequest(
    Guid? SalesInvoiceAccountId, string? SalesInvoiceAccountCode, string? SalesInvoiceAccountName,
    Guid? InventoryAccountId, string? InventoryAccountCode, string? InventoryAccountName,
    Guid? CogsAccountId, string? CogsAccountCode, string? CogsAccountName,
    Guid? SalesRevenueAccountId, string? SalesRevenueAccountCode, string? SalesRevenueAccountName,
    Guid? SalesReturnAccountId, string? SalesReturnAccountCode, string? SalesReturnAccountName,
    Guid? AdvancePaymentAccountId, string? AdvancePaymentAccountCode, string? AdvancePaymentAccountName,
    Guid? DiscountAllowedAccountId, string? DiscountAllowedAccountCode, string? DiscountAllowedAccountName,
    Guid? TaxAccountId, string? TaxAccountCode, string? TaxAccountName,
    Guid? ServicesRevenueAccountId, string? ServicesRevenueAccountCode, string? ServicesRevenueAccountName,
    Guid? ServicesCostAccountId, string? ServicesCostAccountCode, string? ServicesCostAccountName,
    Guid? LoyaltyCustomersAccountId, string? LoyaltyCustomersAccountCode, string? LoyaltyCustomersAccountName,
    Guid? RoundingAccountId, string? RoundingAccountCode, string? RoundingAccountName,
    Guid? AdditionalExpensesAccountId, string? AdditionalExpensesAccountCode, string? AdditionalExpensesAccountName,
    Guid? TransferClearingAccountId, string? TransferClearingAccountCode, string? TransferClearingAccountName,
    Guid? AdjustmentVarianceAccountId, string? AdjustmentVarianceAccountCode, string? AdjustmentVarianceAccountName);

public record CopyWarehouseAccountMappingRequest(
    Guid SourceWarehouseId,
    int SourcePaymentMethod,
    int TargetPaymentMethod);

public record UpdateWarehouseRequest(
    string NameAr,
    string NameEn,
    Guid? BranchId,
    string? BranchName,
    string? Location,
    string? ManagerName,
    string? ManagerPhone,
    bool IsDefault);

public record CreateWarehouseRequest(
    string Code,
    string NameAr,
    string NameEn,
    Guid? BranchId,
    string? BranchName,
    string? Location,
    string? ManagerName,
    string? ManagerPhone,
    bool IsDefault);

public record ToggleWarehouseStatusRequest(bool IsActive);
