using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

public class Salesperson : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? PhoneNumber { get; private set; }
    public string? Email { get; private set; }

    // User account mapping
    public Guid? UserId { get; private set; }
    public string? UserName { get; private set; }

    // Dedicated Warehouse
    public string WarehouseCode { get; private set; } = "WH-01";
    public string WarehouseNameAr { get; private set; } = "المستودع الرئيسي";

    // Branch & Department
    public Guid? BranchId { get; private set; }
    public string? DepartmentName { get; private set; }
    public string? DepartmentNameEn { get; private set; }

    public decimal CommissionRate { get; private set; } = 0m;
    public bool IsActive { get; private set; } = true;

    // Granular Operational Permissions
    public bool CanGiveDiscount { get; private set; } = true;
    public decimal MaxDiscountPercent { get; private set; } = 5.0m;
    public bool CanSellCredit { get; private set; } = false;
    public bool CanEditPrice { get; private set; } = false;
    public bool CanProcessReturns { get; private set; } = false;
    public bool CanSellBelowCost { get; private set; } = false;
    public bool CanViewCostPrice { get; private set; } = false;
    public bool CanSellFromAnyWarehouse { get; private set; } = false;
    public string? PermissionsJson { get; private set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Salesperson() { }

    public static Salesperson Create(
        Guid tenantId,
        Guid companyId,
        string code,
        string nameAr,
        string nameEn,
        string warehouseCode,
        string warehouseNameAr,
        Guid? userId = null,
        string? userName = null,
        string? phoneNumber = null,
        string? email = null,
        Guid? branchId = null,
        decimal commissionRate = 0m,
        bool canGiveDiscount = true,
        decimal maxDiscountPercent = 5.0m,
        bool canSellCredit = false,
        bool canEditPrice = false,
        bool canProcessReturns = false,
        bool canSellBelowCost = false,
        bool canViewCostPrice = false,
        bool canSellFromAnyWarehouse = false,
        string? permissionsJson = null,
        string? createdBy = null,
        string? departmentName = null,
        string? departmentNameEn = null)
    {
        return new Salesperson
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            Code = code.Trim().ToUpperInvariant(),
            NameAr = nameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim(),
            WarehouseCode = string.IsNullOrWhiteSpace(warehouseCode) ? "WH-01" : warehouseCode.Trim().ToUpperInvariant(),
            WarehouseNameAr = string.IsNullOrWhiteSpace(warehouseNameAr) ? "المستودع المخصص" : warehouseNameAr.Trim(),
            UserId = userId,
            UserName = userName?.Trim().ToLowerInvariant(),
            PhoneNumber = phoneNumber?.Trim(),
            Email = email?.Trim().ToLowerInvariant(),
            BranchId = branchId,
            DepartmentName = string.IsNullOrWhiteSpace(departmentName) ? null : departmentName.Trim(),
            DepartmentNameEn = string.IsNullOrWhiteSpace(departmentNameEn) ? null : departmentNameEn.Trim(),
            CommissionRate = Math.Max(0, commissionRate),
            CanGiveDiscount = canGiveDiscount,
            MaxDiscountPercent = Math.Clamp(maxDiscountPercent, 0m, 100m),
            CanSellCredit = canSellCredit,
            CanEditPrice = canEditPrice,
            CanProcessReturns = canProcessReturns,
            CanSellBelowCost = canSellBelowCost,
            CanViewCostPrice = canViewCostPrice,
            CanSellFromAnyWarehouse = canSellFromAnyWarehouse,
            PermissionsJson = permissionsJson,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        string warehouseCode,
        string warehouseNameAr,
        Guid? userId,
        string? userName,
        string? phoneNumber,
        string? email,
        Guid? branchId,
        decimal commissionRate,
        bool isActive,
        bool canGiveDiscount = true,
        decimal maxDiscountPercent = 5.0m,
        bool canSellCredit = false,
        bool canEditPrice = false,
        bool canProcessReturns = false,
        bool canSellBelowCost = false,
        bool canViewCostPrice = false,
        bool canSellFromAnyWarehouse = false,
        string? permissionsJson = null,
        string? modifiedBy = null,
        string? departmentName = null,
        string? departmentNameEn = null)
    {
        NameAr = nameAr.Trim();
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim();
        WarehouseCode = string.IsNullOrWhiteSpace(warehouseCode) ? "WH-01" : warehouseCode.Trim().ToUpperInvariant();
        WarehouseNameAr = string.IsNullOrWhiteSpace(warehouseNameAr) ? "المستودع المخصص" : warehouseNameAr.Trim();
        UserId = userId;
        UserName = userName?.Trim().ToLowerInvariant();
        PhoneNumber = phoneNumber?.Trim();
        Email = email?.Trim().ToLowerInvariant();
        BranchId = branchId;
        DepartmentName = string.IsNullOrWhiteSpace(departmentName) ? null : departmentName.Trim();
        DepartmentNameEn = string.IsNullOrWhiteSpace(departmentNameEn) ? null : departmentNameEn.Trim();
        CommissionRate = Math.Max(0, commissionRate);
        CanGiveDiscount = canGiveDiscount;
        MaxDiscountPercent = Math.Clamp(maxDiscountPercent, 0m, 100m);
        CanSellCredit = canSellCredit;
        CanEditPrice = canEditPrice;
        CanProcessReturns = canProcessReturns;
        CanSellBelowCost = canSellBelowCost;
        CanViewCostPrice = canViewCostPrice;
        CanSellFromAnyWarehouse = canSellFromAnyWarehouse;
        PermissionsJson = permissionsJson;
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
