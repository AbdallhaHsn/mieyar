using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/hr")]
[Authorize]
public class HrAdvancesAndCustodyController : ControllerBase
{
    private readonly HumanResourcesDbContext _dbContext;
    private readonly ICurrentTenantContext _tenantContext;

    public HrAdvancesAndCustodyController(
        HumanResourcesDbContext dbContext,
        ICurrentTenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    private Guid CurrentCompanyId =>
        _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-2222-3333-4444-555555555555");

    #region 1. Employee Advances (السلف المالية)

    [HttpGet("advances")]
    public async Task<IActionResult> GetAdvances([FromQuery] AdvanceStatus? status, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;


        var query = _dbContext.EmployeeAdvances
            .Include(a => a.Employee)
            .Where(a => a.CompanyId == companyId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        var advances = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new
            {
                a.Id,
                a.AdvanceNumber,
                a.EmployeeId,
                EmployeeNameAr = a.Employee != null ? a.Employee.FullNameAr : "موظف",
                EmployeeNameEn = a.Employee != null ? a.Employee.FullNameEn : "Employee",
                EmployeeNumber = a.Employee != null ? a.Employee.EmployeeNumber : "",
                JobTitleAr = a.Employee != null ? a.Employee.JobTitleAr : "",
                DepartmentName = a.Employee != null ? a.Employee.DepartmentName : "",
                BasicSalary = a.Employee != null ? a.Employee.BasicSalary : 0m,
                a.RequestDate,
                a.Amount,
                a.InstallmentsCount,
                a.MonthlyDeductionAmount,
                a.DeductionStartPeriod,
                a.PaidAmount,
                a.RemainingAmount,
                a.ReasonAr,
                a.ReasonEn,
                a.Notes,
                a.Status,
                StatusText = a.Status == AdvanceStatus.Pending ? "قيد المراجعة" :
                             a.Status == AdvanceStatus.Approved ? "معتمدة" :
                             a.Status == AdvanceStatus.Disbursed ? "مصروفة (نشطة)" :
                             a.Status == AdvanceStatus.FullySettled ? "مسددة بالكامل" :
                             a.Status == AdvanceStatus.Rejected ? "مرفوضة" : "ملغية",
                a.ApprovedBy,
                a.ApprovedAtUtc,
                a.RejectionReason,
                a.DisbursedBy,
                a.DisbursedAtUtc,
                a.DisbursementAccount
            })
            .ToListAsync(cancellationToken);

        return Ok(advances);
    }

    [HttpPost("advances")]
    public async Task<IActionResult> CreateAdvance([FromBody] CreateAdvanceRequest req, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;
        var tenantId = _tenantContext.TenantId ?? companyId;

        var count = await _dbContext.EmployeeAdvances.IgnoreQueryFilters().CountAsync(a => a.CompanyId == companyId, cancellationToken);
        var advanceNumber = $"ADV-2026-{(count + 1):D3}";

        var advance = EmployeeAdvance.Create(
            tenantId,
            companyId,
            advanceNumber,
            req.EmployeeId,
            req.RequestDate ?? DateTime.UtcNow,
            req.Amount,
            req.InstallmentsCount > 0 ? req.InstallmentsCount : 1,
            req.DeductionStartPeriod ?? DateTime.UtcNow.ToString("yyyy-MM"),
            req.ReasonAr,
            req.ReasonEn ?? req.ReasonAr,
            req.Notes,
            createdBy: _tenantContext.UserName ?? "Admin");

        await _dbContext.EmployeeAdvances.AddAsync(advance, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { advance.Id, advance.AdvanceNumber, message = "تم تقديم طلب السلفة بنجاح" });
    }

    [HttpPut("advances/{id:guid}/approve")]
    public async Task<IActionResult> ApproveAdvance(Guid id, CancellationToken cancellationToken)
    {
        var advance = await _dbContext.EmployeeAdvances.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (advance == null) return NotFound("السلفة غير موجودة");

        advance.Approve(_tenantContext.UserName ?? "Admin");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "تم اعتماد السلفة بنجاح" });
    }

    [HttpPut("advances/{id:guid}/reject")]
    public async Task<IActionResult> RejectAdvance(Guid id, [FromBody] RejectAdvanceRequest req, CancellationToken cancellationToken)
    {
        var advance = await _dbContext.EmployeeAdvances.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (advance == null) return NotFound("السلفة غير موجودة");

        advance.Reject(_tenantContext.UserName ?? "Admin", req.Reason ?? "لم يتم استيفاء الشروط");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "تم رفض طلب السلفة" });
    }

    [HttpPut("advances/{id:guid}/disburse")]
    public async Task<IActionResult> DisburseAdvance(Guid id, [FromBody] DisburseAdvanceRequest req, CancellationToken cancellationToken)
    {
        var advance = await _dbContext.EmployeeAdvances.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (advance == null) return NotFound("السلفة غير موجودة");

        advance.Disburse(_tenantContext.UserName ?? "Admin", req.DisbursementAccount ?? "الصندوق الرئيسي");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "تم صرف السلفة للموظف بنجاح" });
    }

    #endregion

    #region 2. Employee Custodies (العهد العينية والمالية)

    [HttpGet("custodies")]
    public async Task<IActionResult> GetCustodies([FromQuery] CustodyType? type, [FromQuery] CustodyStatus? status, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;


        var query = _dbContext.EmployeeCustodies
            .Include(c => c.Employee)
            .Where(c => c.CompanyId == companyId);

        if (type.HasValue) query = query.Where(c => c.CustodyType == type.Value);
        if (status.HasValue) query = query.Where(c => c.Status == status.Value);

        var custodies = await query
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new
            {
                c.Id,
                c.CustodyNumber,
                c.EmployeeId,
                EmployeeNameAr = c.Employee != null ? c.Employee.FullNameAr : "موظف",
                EmployeeNameEn = c.Employee != null ? c.Employee.FullNameEn : "Employee",
                EmployeeNumber = c.Employee != null ? c.Employee.EmployeeNumber : "",
                JobTitleAr = c.Employee != null ? c.Employee.JobTitleAr : "",
                DepartmentName = c.Employee != null ? c.Employee.DepartmentName : "",
                c.CustodyType,
                CustodyTypeNameAr = c.CustodyType == CustodyType.PhysicalAsset ? "أجهزة ومعدات" :
                                    c.CustodyType == CustodyType.Vehicle ? "سيارة / مركبة" :
                                    c.CustodyType == CustodyType.PettyCash ? "عهدة نقدية" :
                                    c.CustodyType == CustodyType.AccessCard ? "بطاقة ومفاتيح" : "أخرى",
                c.ItemNameAr,
                c.ItemNameEn,
                c.SerialOrTagNumber,
                c.EstimatedValue,
                c.AssignedDate,
                c.Status,
                StatusText = c.Status == CustodyStatus.Active ? "في عهدة الموظف" :
                             c.Status == CustodyStatus.PendingReturn ? "بانتظار الاسترجاع" :
                             c.Status == CustodyStatus.Returned ? "تم الاسترجاع بحالة سليمة" :
                             c.Status == CustodyStatus.Damaged ? "تالفة" : "مفقودة",
                c.ReturnedDate,
                c.ReceivedBy,
                c.ReturnConditionNotes
            })
            .ToListAsync(cancellationToken);

        return Ok(custodies);
    }

    [HttpPost("custodies")]
    public async Task<IActionResult> AssignCustody([FromBody] CreateCustodyRequest req, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;
        var tenantId = _tenantContext.TenantId ?? companyId;

        var count = await _dbContext.EmployeeCustodies.IgnoreQueryFilters().CountAsync(c => c.CompanyId == companyId, cancellationToken);
        var custodyNumber = $"CUS-2026-{(count + 1):D3}";

        var custody = EmployeeCustody.Create(
            tenantId,
            companyId,
            custodyNumber,
            req.EmployeeId,
            req.CustodyType,
            req.ItemNameAr,
            req.ItemNameEn ?? req.ItemNameAr,
            req.SerialOrTagNumber,
            req.EstimatedValue,
            req.AssignedDate ?? DateTime.UtcNow,
            createdBy: _tenantContext.UserName ?? "Admin");

        await _dbContext.EmployeeCustodies.AddAsync(custody, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { custody.Id, custody.CustodyNumber, message = "تم تسليم العهدة للموظف بنجاح" });
    }

    [HttpPut("custodies/{id:guid}/return")]
    public async Task<IActionResult> ReturnCustody(Guid id, [FromBody] ReturnCustodyRequest req, CancellationToken cancellationToken)
    {
        var custody = await _dbContext.EmployeeCustodies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (custody == null) return NotFound("العهدة غير موجودة");

        custody.ReturnCustody(
            req.ReturnedDate ?? DateTime.UtcNow,
            _tenantContext.UserName ?? "Admin",
            req.Notes,
            req.Condition);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "تم استرجاع العهدة وإخلاء طرف الموظف بنجاح" });
    }

    #endregion

    #region 3. HR Policy Settings (لوحة الإعدادات والسياسات)

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;
        var settings = await _dbContext.HrPolicySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId, cancellationToken);

        if (settings == null)
        {
            var tenantId = _tenantContext.TenantId ?? companyId;
            settings = HrPolicySettings.CreateDefault(tenantId, companyId, "System");
            await _dbContext.HrPolicySettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(new
        {
            settings.Id,
            settings.MaxAdvanceSalaryPercentage,
            settings.MaxInstallmentMonths,
            settings.AutoDeductAdvancesInPayroll,
            settings.MinServiceMonthsForAdvance,
            settings.RequireDirectManagerApproval,
            settings.RequireFinancialApproval,
            settings.RequireInspectionOnCustodyReturn,
            settings.AutoDeductDamagedCustodyValue
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateHrSettingsRequest req, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;
        var settings = await _dbContext.HrPolicySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId, cancellationToken);

        if (settings == null)
        {
            var tenantId = _tenantContext.TenantId ?? companyId;
            settings = HrPolicySettings.CreateDefault(tenantId, companyId, "System");
            await _dbContext.HrPolicySettings.AddAsync(settings, cancellationToken);
        }

        settings.Update(
            req.MaxAdvanceSalaryPercentage,
            req.MaxInstallmentMonths,
            req.AutoDeductAdvancesInPayroll,
            req.MinServiceMonthsForAdvance,
            req.RequireDirectManagerApproval,
            req.RequireFinancialApproval,
            req.RequireInspectionOnCustodyReturn,
            req.AutoDeductDamagedCustodyValue,
            _tenantContext.UserName ?? "Admin");

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "تم حفظ سياسات وإعدادات الموارد البشرية بنجاح" });
    }

    #endregion

    #region Seed Samples

    private async Task SeedSampleAdvancesAsync(Guid companyId, CancellationToken ct)
    {
        var emp = await _dbContext.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.CompanyId == companyId, ct);
        if (emp == null) return;

        var tenantId = emp.TenantId;
        var adv1 = EmployeeAdvance.Create(
            tenantId, companyId, "ADV-2026-001", emp.Id,
            DateTime.UtcNow.AddDays(-20), 6000m, 6, "2026-11",
            "سلفة زواج ودعم أسري", "Marriage & Family Support Advance",
            "طلب معتمد ومسجل", "HR Manager");
        adv1.Approve("HR Director");
        adv1.Disburse("Financial Manager", "مصرف الراجحي");
        adv1.RecordInstallmentPayment(1000m, "Payroll");

        var adv2 = EmployeeAdvance.Create(
            tenantId, companyId, "ADV-2026-002", emp.Id,
            DateTime.UtcNow.AddDays(-2), 3500m, 4, "2026-12",
            "سلفة صيانة مركبة خاصة", "Car Repair Advance",
            "بانتظار موافقة الإدارة", "Employee Self-Service");

        await _dbContext.EmployeeAdvances.AddRangeAsync(adv1, adv2);
        await _dbContext.SaveChangesAsync(ct);
    }

    private async Task SeedSampleCustodiesAsync(Guid companyId, CancellationToken ct)
    {
        var emp = await _dbContext.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.CompanyId == companyId, ct);
        if (emp == null) return;

        var tenantId = emp.TenantId;
        var cus1 = EmployeeCustody.Create(
            tenantId, companyId, "CUS-2026-001", emp.Id,
            CustodyType.PhysicalAsset, "كمبيوتر محمول Dell Precision 5570",
            "Laptop Dell Precision 5570 i7 32GB", "SN-DELL-89921",
            8500m, DateTime.UtcNow.AddMonths(-3), "IT Manager");

        var cus2 = EmployeeCustody.Create(
            tenantId, companyId, "CUS-2026-002", emp.Id,
            CustodyType.PettyCash, "عهدة نقدية للمشتريات النثرية",
            "Petty Cash Float for Office Supplies", "FLOAT-2026-01",
            2000m, DateTime.UtcNow.AddMonths(-1), "Finance Manager");

        var cus3 = EmployeeCustody.Create(
            tenantId, companyId, "CUS-2026-003", emp.Id,
            CustodyType.Vehicle, "سيارة تويوتا هايلكس غمارة",
            "Toyota Hilux Single Cabin", "لوحة: أ ب ج 4567",
            75000m, DateTime.UtcNow.AddMonths(-6), "Fleet Officer");

        await _dbContext.EmployeeCustodies.AddRangeAsync(cus1, cus2, cus3);
        await _dbContext.SaveChangesAsync(ct);
    }

    #endregion
}

public record CreateAdvanceRequest(
    Guid EmployeeId,
    decimal Amount,
    int InstallmentsCount,
    DateTime? RequestDate,
    string? DeductionStartPeriod,
    string ReasonAr,
    string? ReasonEn,
    string? Notes);

public record RejectAdvanceRequest(string? Reason);

public record DisburseAdvanceRequest(string? DisbursementAccount);

public record CreateCustodyRequest(
    Guid EmployeeId,
    CustodyType CustodyType,
    string ItemNameAr,
    string? ItemNameEn,
    string? SerialOrTagNumber,
    decimal EstimatedValue,
    DateTime? AssignedDate);

public record ReturnCustodyRequest(
    DateTime? ReturnedDate,
    string? Notes,
    CustodyStatus Condition = CustodyStatus.Returned);

public record UpdateHrSettingsRequest(
    decimal MaxAdvanceSalaryPercentage,
    int MaxInstallmentMonths,
    bool AutoDeductAdvancesInPayroll,
    decimal MinServiceMonthsForAdvance,
    bool RequireDirectManagerApproval,
    bool RequireFinancialApproval,
    bool RequireInspectionOnCustodyReturn,
    bool AutoDeductDamagedCustodyValue);
