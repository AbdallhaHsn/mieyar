using System.Security.Cryptography;
using AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;
using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Application.Queries.GetCompanies;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.WebAPI.Security;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[SkipTenantEnforcement]
public class CompaniesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILicenseService _license;
    private readonly IPasswordHasher _passwordHasher;
    private readonly AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.IdentityAndAccessDbContext _db;
    private readonly AlRobban.Modules.Purchasing.Infrastructure.Persistence.PurchasingDbContext _purchasingDb;

    public CompaniesController(
        IMediator mediator,
        ILicenseService license,
        IPasswordHasher passwordHasher,
        AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.IdentityAndAccessDbContext db,
        AlRobban.Modules.Purchasing.Infrastructure.Persistence.PurchasingDbContext purchasingDb)
    {
        _mediator = mediator;
        _license = license;
        _passwordHasher = passwordHasher;
        _db = db;
        _purchasingDb = purchasingDb;
    }

    /// <summary>
    /// استرجاع بيانات المنشأة الحالية التابع لها المستخدم المسجل (الاسم، الشعار، السجل، الرقم الضريبي، الفروع)
    /// </summary>
    [HttpGet("current")]
    [ProducesResponseType(typeof(CompanyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentCompany(CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        var result = await _mediator.Send(new GetAllCompaniesQuery(), cancellationToken);
        if (result.IsFailure || result.Value == null || !result.Value.Any())
        {
            return NotFound(new { code = "Company.NotFound", description = "لا توجد منشآت مسجلة بالنظام." });
        }

        if (Guid.TryParse(tenantIdClaim, out var tenantId) && tenantId != Guid.Empty)
        {
            var matchedCompany = result.Value.FirstOrDefault(c => c.Id == tenantId);
            if (matchedCompany != null) return Ok(matchedCompany);
        }

        // The platform owner (SuperAdmin) is not bound to any company and must not read company data.
        return NotFound(new { code = "Company.NotFound", description = "لا توجد منشأة مرتبطة بحسابك." });
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(IReadOnlyList<CompanyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllCompaniesQuery(), cancellationToken);
        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(CompanyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateCompanyCommand command, CancellationToken cancellationToken)
    {
        var cap = await _license.CheckCanAddCompanyAsync(cancellationToken);
        if (!cap.Allowed) return StatusCode(StatusCodes.Status403Forbidden, cap.ToResponse());

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetAll), new { id = result.Value.Id }, result.Value);
    }

    [HttpPost("onboard")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(CompanyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> OnboardCompanyWithAdmin(
        [FromBody] AlRobban.Modules.IdentityAndAccess.Application.Commands.OnboardCompany.OnboardCompanyCommand command,
        CancellationToken cancellationToken)
    {
        var cap = await _license.CheckCanAddCompanyAsync(cancellationToken);
        if (!cap.Allowed) return StatusCode(StatusCodes.Status403Forbidden, cap.ToResponse());

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetAll), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// إعادة تهيئة الحسابات والإعدادات الافتراضية للشركة (دليل الحسابات، السنة المالية، مراكز التكلفة، والشركاء)
    /// </summary>
    [HttpPost("{companyId:guid}/seed-defaults")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SeedCompanyDefaults(Guid companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllCompaniesQuery(), cancellationToken);
        var company = result.Value?.FirstOrDefault(c => c.Id == companyId);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة / Company not found." });
        }

        await _mediator.Publish(new AlRobban.Shared.Application.Events.CompanyCreatedEvent(
            company.Id,
            company.Id,
            company.Code,
            company.NameAr,
            company.NameEn,
            company.CurrencyCode), cancellationToken);

        return Ok(new { success = true, message = "تمت تهيئة الحسابات والإعدادات الافتراضية بنجاح / Company defaults seeded successfully." });
    }

    /// <summary>
    /// <summary>
    /// تحديث حالة الشركة (تفعيل / تعليق الاشتراك)
    /// </summary>
    [HttpPut("{companyId:guid}/status")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCompanyStatus(
        Guid companyId,
        [FromBody] UpdateCompanyStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new AlRobban.Modules.IdentityAndAccess.Application.Commands.UpdateCompanyStatus.UpdateCompanyStatusCommand(companyId, request.IsActive),
            cancellationToken);

        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(new { companyId, isActive = result.Value });
    }

    /// <summary>
    /// تحديث بيانات وهوية المنشأة الحالية (الاسم التجاري، الشعار، الرقم الضريبي، السجل التجاري)
    /// </summary>
    [HttpPut("current")]
    [Authorize(Roles = AppRoles.CompanyAdmin)]
    [ProducesResponseType(typeof(CompanyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCurrentCompany(
        [FromBody] UpdateCompanyProfileRequest request,
        CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        Guid targetCompanyId = Guid.Empty;

        if (Guid.TryParse(tenantIdClaim, out var tenantId) && tenantId != Guid.Empty)
        {
            targetCompanyId = tenantId;
        }
        else
        {
            return BadRequest(new { code = "Company.InvalidTenant", description = "تعذر تحديد المنشأة المستهدفة." });
        }

        if (targetCompanyId == Guid.Empty)
        {
            return BadRequest(new { code = "Company.InvalidTenant", description = "تعذر تحديد المنشأة المستهدفة." });
        }

        var result = await _mediator.Send(new AlRobban.Modules.IdentityAndAccess.Application.Commands.UpdateCompanyProfile.UpdateCompanyProfileCommand(
            targetCompanyId,
            request.NameAr,
            request.NameEn,
            request.VatNumber,
            request.CommercialRegistration,
            request.LogoUrl,
            request.BrandThemeColor,
            request.Address), cancellationToken);

        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
    /// <summary>
    /// Platform owner only: license limits and aggregate usage counters for every company.
    /// Returns counts only - never any business records.
    /// </summary>
    [HttpGet("licenses")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> GetLicenseOverview(CancellationToken cancellationToken)
    {
        var companies = await _db.Companies.AsNoTracking().ToListAsync(cancellationToken);

        var users = await _db.Users.IgnoreQueryFilters().AsNoTracking()
            .Where(u => u.TenantId != null && u.IsActive)
            .GroupBy(u => u.TenantId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

        var tenantAdminUsers = await _db.Users.IgnoreQueryFilters().AsNoTracking()
            .Where(u => u.TenantId != null && u.IsActive)
            .GroupBy(u => u.TenantId!.Value)
            .Select(g => new
            {
                TenantId = g.Key,
                AdminUser = g.OrderBy(u => u.Role == AlRobban.Modules.IdentityAndAccess.Domain.Enums.UserRole.CompanyAdmin ? 0 : 1)
                             .ThenBy(u => u.CreatedAtUtc)
                             .Select(u => new { u.UserName, u.FullNameAr })
                             .FirstOrDefault()
            })
            .ToDictionaryAsync(x => x.TenantId, x => x.AdminUser, cancellationToken);

        var branches = await _db.Branches.IgnoreQueryFilters().AsNoTracking()
            .GroupBy(b => b.TenantId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

        var warehouses = await _purchasingDb.Warehouses.IgnoreQueryFilters().AsNoTracking()
            .GroupBy(w => w.CompanyId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

        var result = companies.Select(c =>
        {
            var uUsed = users.GetValueOrDefault(c.Id);
            var wUsed = warehouses.GetValueOrDefault(c.Id);
            var bUsed = branches.GetValueOrDefault(c.Id);
            var admin = tenantAdminUsers.GetValueOrDefault(c.Id);
            return new LicenseOverviewDto(
                c.Id,
                c.MaxUsers,
                c.MaxWarehouses,
                c.MaxBranches,
                c.LicenseExpiresAtUtc,
                uUsed,
                wUsed,
                bUsed,
                c.MaxUsers.HasValue ? Math.Max(0, c.MaxUsers.Value - uUsed) : null,
                c.MaxWarehouses.HasValue ? Math.Max(0, c.MaxWarehouses.Value - wUsed) : null,
                c.MaxBranches.HasValue ? Math.Max(0, c.MaxBranches.Value - bUsed) : null,
                admin?.UserName,
                admin?.FullNameAr);
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Authenticated tenant user: get current company's license quota and available remaining capacity.
    /// </summary>
    [HttpGet("current/license-quota")]
    [Authorize]
    public async Task<IActionResult> GetCurrentLicenseQuota(CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (!Guid.TryParse(tenantIdClaim, out var tenantId) || tenantId == Guid.Empty)
        {
            return NotFound(new { code = "Tenant.NotFound", description = "المستخدم غير مرتبط بشركة." });
        }

        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == tenantId, cancellationToken);
        if (company == null) return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });

        var usedUsers = await _db.Users.CountAsync(u => u.TenantId == tenantId && u.IsActive, cancellationToken);
        var usedBranches = await _db.Branches.CountAsync(b => b.TenantId == tenantId && b.IsActive, cancellationToken);
        var usedWarehouses = await _purchasingDb.Warehouses.CountAsync(w => w.CompanyId == tenantId && w.IsActive, cancellationToken);

        var daysRemaining = company.LicenseExpiresAtUtc.HasValue
            ? (int)Math.Ceiling((company.LicenseExpiresAtUtc.Value - DateTime.UtcNow).TotalDays)
            : (int?)null;

        var quota = new CompanyQuotaDto(
            company.Id,
            company.MaxUsers,
            usedUsers,
            company.MaxUsers.HasValue ? Math.Max(0, company.MaxUsers.Value - usedUsers) : null,
            company.MaxWarehouses,
            usedWarehouses,
            company.MaxWarehouses.HasValue ? Math.Max(0, company.MaxWarehouses.Value - usedWarehouses) : null,
            company.MaxBranches,
            usedBranches,
            company.MaxBranches.HasValue ? Math.Max(0, company.MaxBranches.Value - usedBranches) : null,
            company.LicenseExpiresAtUtc,
            company.IsLicenseExpired,
            daysRemaining);

        return Ok(quota);
    }

    /// <summary>
    /// Platform owner only: read the license (limits / expiry) of a company. Exposes no business data.
    /// </summary>
    [HttpGet("{companyId:guid}/license")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> GetLicense(Guid companyId, CancellationToken cancellationToken)
    {
        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == companyId, cancellationToken);
        if (company == null) return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });

        return Ok(new LicenseDto(company.Id, company.MaxUsers, company.MaxWarehouses, company.MaxBranches, company.LicenseExpiresAtUtc));
    }

    /// <summary>
    /// Platform owner only: set license limits (null = unlimited) and expiry for a company.
    /// </summary>
    [HttpPut("{companyId:guid}/license")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> SetLicense(Guid companyId, [FromBody] SetLicenseRequest request, CancellationToken cancellationToken)
    {
        if ((request.MaxUsers ?? 1) < 1 || (request.MaxWarehouses ?? 1) < 1 || (request.MaxBranches ?? 1) < 1)
        {
            return BadRequest(new { code = "License.InvalidLimit", description = "الحدود يجب أن تكون أكبر من صفر (أو فارغة للمسموح بلا حد)." });
        }

        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, cancellationToken);
        if (company == null) return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });

        company.SetLicense(request.MaxUsers, request.MaxWarehouses, request.MaxBranches, request.ExpiresAtUtc?.ToUniversalTime());
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new LicenseDto(company.Id, company.MaxUsers, company.MaxWarehouses, company.MaxBranches, company.LicenseExpiresAtUtc));
    }

    /// <summary>
    /// إعادة تعيين كلمة مرور المسؤول التابع للمنشأة بواسطة مدير المنصة
    /// </summary>
    [HttpPost("{companyId:guid}/reset-admin-password")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> ResetAdminPassword(
        Guid companyId, 
        [FromBody] ResetAdminPasswordRequest? request, 
        CancellationToken cancellationToken)
    {
        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == companyId, cancellationToken);
        if (company == null) return NotFound(new { code = "Company.NotFound", description = "المنشأة غير موجودة." });

        var adminUser = await _db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == companyId && u.IsActive)
            .OrderBy(u => u.Role == UserRole.CompanyAdmin ? 0 : 1)
            .ThenBy(u => u.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (adminUser == null)
        {
            return NotFound(new { code = "User.NotFound", description = "لا يوجد حساب مسؤول نشط مرتبط بهذه المنشأة." });
        }

        var newPassword = string.IsNullOrWhiteSpace(request?.NewPassword)
            ? GenerateDefaultPassword(company.Code)
            : request.NewPassword.Trim();

        if (newPassword.Length < 6)
        {
            return BadRequest(new { code = "Password.TooShort", description = "كلمة المرور يجب أن لا تقل عن 6 خانات." });
        }

        var hash = _passwordHasher.HashPassword(newPassword);
        adminUser.ChangePassword(hash, User.Identity?.Name ?? "SuperAdmin");
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            userName = adminUser.UserName,
            fullName = adminUser.FullNameAr,
            companyNameAr = company.NameAr,
            newPassword
        });
    }

    private static string GenerateDefaultPassword(string code)
    {
        var cleanCode = string.IsNullOrWhiteSpace(code) ? "Meyar" : code.Replace("-", "").Trim();
        if (cleanCode.Length > 6) cleanCode = cleanCode[..6];
        var num = RandomNumberGenerator.GetInt32(1000, 9999);
        return $"{cleanCode}@{num}!";
    }
}

public record ResetAdminPasswordRequest(string? NewPassword);

public record LicenseDto(Guid CompanyId, int? MaxUsers, int? MaxWarehouses, int? MaxBranches, DateTime? ExpiresAtUtc);

public record LicenseOverviewDto(
    Guid CompanyId, int? MaxUsers, int? MaxWarehouses, int? MaxBranches, DateTime? ExpiresAtUtc,
    int UsedUsers, int UsedWarehouses, int UsedBranches,
    int? RemainingUsers, int? RemainingWarehouses, int? RemainingBranches,
    string? AdminUserName = null,
    string? AdminFullName = null);

public record CompanyQuotaDto(
    Guid CompanyId,
    int? MaxUsers,
    int UsedUsers,
    int? RemainingUsers,
    int? MaxWarehouses,
    int UsedWarehouses,
    int? RemainingWarehouses,
    int? MaxBranches,
    int UsedBranches,
    int? RemainingBranches,
    DateTime? ExpiresAtUtc,
    bool IsExpired,
    int? DaysRemaining);

public record SetLicenseRequest(int? MaxUsers, int? MaxWarehouses, int? MaxBranches, DateTime? ExpiresAtUtc);

public record UpdateCompanyStatusRequest(bool IsActive);

public record UpdateCompanyProfileRequest(
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string? LogoUrl = null,
    string? BrandThemeColor = "#0f766e",
    NationalAddressDto? Address = null);


