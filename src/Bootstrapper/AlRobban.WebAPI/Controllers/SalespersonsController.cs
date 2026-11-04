using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalespersonsController : ControllerBase
{
    private const int MinPasswordLength = 8;

    private readonly ISalespersonRepository _salespersonRepo;
    private readonly IUserRepository _userRepo;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICurrentTenantContext _tenant;
    private readonly ILicenseService _license;

    public SalespersonsController(
        ISalespersonRepository salespersonRepo,
        IUserRepository userRepo,
        IPasswordHasher passwordHasher,
        ICurrentTenantContext tenant,
        ILicenseService license)
    {
        _salespersonRepo = salespersonRepo;
        _userRepo = userRepo;
        _passwordHasher = passwordHasher;
        _tenant = tenant;
        _license = license;
    }

    /// <summary>Authenticated tenant (guaranteed by TenantEnforcementFilter before any action runs).</summary>
    private Guid CurrentCompanyId =>
        _tenant.TenantId ?? throw new InvalidOperationException("Tenant context is required.");

    private bool IsSalesperson => string.Equals(_tenant.Role, AppRoles.Salesperson, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// استرجاع قائمة البائعين ومندوبي المبيعات للشركة الحالية مع الفلترة
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SalespersonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] bool? isActive,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var list = await _salespersonRepo.GetListAsync(CurrentCompanyId, isActive, search, cancellationToken);

        // A salesperson only ever sees their own profile (no visibility of colleagues / their warehouses)
        if (IsSalesperson)
        {
            list = list.Where(s => s.UserId.HasValue && s.UserId.Value.ToString() == _tenant.UserId).ToList();
        }

        return Ok(list.Select(MapToDto).ToList());
    }

    /// <summary>
    /// استرجاع بيانات بائع محدد بواسطة المعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = AppRoles.BackOffice)]
    [ProducesResponseType(typeof(SalespersonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var sp = await _salespersonRepo.GetByIdAsync(id, cancellationToken);
        if (sp == null || sp.CompanyId != CurrentCompanyId)
        {
            return NotFound(new { code = "Salesperson.NotFound", message = "لم يتم العثور على البائع المحدد" });
        }
        return Ok(MapToDto(sp));
    }

    /// <summary>
    /// استرجاع بروفايل البائع المرتبط بحساب المستخدم المسجل حالياً
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(SalespersonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByUserId([FromRoute] Guid userId, CancellationToken cancellationToken)
    {
        if (IsSalesperson && userId.ToString() != _tenant.UserId)
        {
            return Forbid();
        }

        var sp = await _salespersonRepo.GetByUserIdAsync(CurrentCompanyId, userId, cancellationToken);
        if (sp == null)
        {
            return NotFound(new { code = "Salesperson.NotAssigned", message = "المستخدم الحالي غير مسجل كبائع معتمد" });
        }
        return Ok(MapToDto(sp));
    }

    /// <summary>
    /// استرجاع مستخدمي الشركة المتاحين للربط مع بائع
    /// </summary>
    [HttpGet("available-users")]
    [Authorize(Roles = AppRoles.Admins)]
    public async Task<IActionResult> GetAvailableUsers(CancellationToken cancellationToken)
    {
        var users = await _userRepo.GetUsersByTenantAsync(CurrentCompanyId, cancellationToken);
        var salespersons = await _salespersonRepo.GetListAsync(CurrentCompanyId, cancellationToken: cancellationToken);
        var linkedUserIds = salespersons.Where(s => s.UserId.HasValue).Select(s => s.UserId!.Value).ToHashSet();

        var list = users.Select(u => new
        {
            u.Id,
            u.UserName,
            u.Email,
            u.FullNameAr,
            u.FullNameEn,
            u.PhoneNumber,
            Role = u.Role.ToString(),
            u.IsActive,
            IsAlreadyLinked = linkedUserIds.Contains(u.Id)
        }).ToList();
        return Ok(list);
    }

    /// <summary>
    /// استرجاع قائمة الأقسام المسجلة للبائعين في الشركة
    /// </summary>
    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments(CancellationToken cancellationToken)
    {
        var salespersons = await _salespersonRepo.GetListAsync(CurrentCompanyId, cancellationToken: cancellationToken);
        var distinctDepartments = salespersons
            .Where(s => !string.IsNullOrWhiteSpace(s.DepartmentName))
            .GroupBy(s => s.DepartmentName!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new
            {
                NameAr = g.Key,
                NameEn = g.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.DepartmentNameEn))?.DepartmentNameEn ?? g.Key
            })
            .ToList();

        return Ok(distinctDepartments);
    }

    /// <summary>
    /// إنشاء بائع جديد وربطه بالمستودع المخصص وحساب المستخدم
    /// </summary>
    [HttpPost]
    [Authorize(Roles = AppRoles.Admins)]
    [ProducesResponseType(typeof(SalespersonDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateSalespersonRequest request, CancellationToken cancellationToken)
    {
        var companyId = CurrentCompanyId;
        Guid? linkedUserId = request.UserId;
        string? linkedUserName = request.UserName;

        if (linkedUserId.HasValue)
        {
            if (!await UserBelongsToTenantAsync(linkedUserId.Value, companyId, cancellationToken))
            {
                return BadRequest(new { code = "User.NotInTenant", message = "المستخدم المحدد لا ينتمي لهذه الشركة" });
            }

            var linkedUser = await _userRepo.GetByIdAsync(linkedUserId.Value, cancellationToken);
            if (linkedUser != null)
            {
                linkedUserName = linkedUser.UserName;
                if (string.IsNullOrWhiteSpace(request.NameAr)) request.NameAr = linkedUser.FullNameAr;
                if (string.IsNullOrWhiteSpace(request.NameEn)) request.NameEn = linkedUser.FullNameEn;
                if (string.IsNullOrWhiteSpace(request.Email)) request.Email = linkedUser.Email;
                if (string.IsNullOrWhiteSpace(request.PhoneNumber)) request.PhoneNumber = linkedUser.PhoneNumber;
            }
        }

        if (string.IsNullOrWhiteSpace(request.NameAr))
        {
            return BadRequest(new { code = "Salesperson.NameArRequired", message = "اسم البائع باللغة العربية مطلوب" });
        }

        var code = string.IsNullOrWhiteSpace(request.Code)
            ? $"SAL-{(await _salespersonRepo.GetListAsync(companyId, cancellationToken: cancellationToken)).Count + 1:D3}"
            : request.Code.Trim();

        var existing = await _salespersonRepo.GetByCodeAsync(companyId, code, cancellationToken);
        if (existing != null)
        {
            return BadRequest(new { code = "Salesperson.CodeExists", message = "كود البائع مسجل مسبقاً لموظف آخر" });
        }

        // Auto-create user account if requested
        if (request.CreateUserAccount && !string.IsNullOrWhiteSpace(request.UserName))
        {
            var existingUsers = await _userRepo.GetUsersByTenantAsync(companyId, cancellationToken);
            var licenseCheck = await _license.CheckCanAddAsync(companyId, LicenseResource.Users, existingUsers.Count(u => u.IsActive), cancellationToken);
            if (!licenseCheck.Allowed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, licenseCheck.ToResponse());
            }

            var uName = request.UserName.Trim().ToLowerInvariant();
            if (await _userRepo.ExistsWithUserNameAsync(uName, cancellationToken))
            {
                return BadRequest(new { code = "User.UsernameExists", message = "اسم المستخدم مسجل مسبقاً في النظام" });
            }

            if (string.IsNullOrWhiteSpace(request.UserPassword) || request.UserPassword.Length < MinPasswordLength)
            {
                return BadRequest(new
                {
                    code = "User.WeakPassword",
                    message = $"كلمة المرور إلزامية ويجب ألا تقل عن {MinPasswordLength} أحرف"
                });
            }

            var passwordHash = _passwordHasher.HashPassword(request.UserPassword);
            var email = !string.IsNullOrWhiteSpace(request.Email) ? request.Email : $"{uName}@alrobban.local";

            var targetRole = UserRole.Salesperson;
            if (!string.IsNullOrWhiteSpace(request.TargetRole) && Enum.TryParse<UserRole>(request.TargetRole, true, out var parsedRole))
            {
                targetRole = parsedRole;
            }

            var newUser = new User(
                Guid.NewGuid(),
                companyId,
                uName,
                email,
                passwordHash,
                request.NameAr,
                !string.IsNullOrWhiteSpace(request.NameEn) ? request.NameEn : request.NameAr,
                targetRole,
                request.PhoneNumber);

            await _userRepo.AddAsync(newUser, cancellationToken);
            await _userRepo.SaveChangesAsync(cancellationToken);

            linkedUserId = newUser.Id;
            linkedUserName = newUser.UserName;
        }

        var salesperson = Salesperson.Create(
            companyId,
            companyId,
            code,
            request.NameAr,
            request.NameEn,
            request.WarehouseCode,
            request.WarehouseNameAr,
            linkedUserId,
            linkedUserName,
            request.PhoneNumber,
            request.Email,
            request.BranchId,
            request.CommissionRate,
            request.CanGiveDiscount,
            request.MaxDiscountPercent,
            request.CanSellCredit,
            request.CanEditPrice,
            request.CanProcessReturns,
            request.CanSellBelowCost,
            request.CanViewCostPrice,
            request.CanSellFromAnyWarehouse,
            null,
            _tenant.UserName ?? "Admin",
            request.DepartmentName,
            request.DepartmentNameEn);

        await _salespersonRepo.AddAsync(salesperson, cancellationToken);
        await _salespersonRepo.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = salesperson.Id }, MapToDto(salesperson));
    }

    /// <summary>
    /// تحديث بيانات بائع والمستودع المخصص وحساب الدخول
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admins)]
    [ProducesResponseType(typeof(SalespersonDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateSalespersonRequest request, CancellationToken cancellationToken)
    {
        var sp = await _salespersonRepo.GetByIdAsync(id, cancellationToken);
        if (sp == null || sp.CompanyId != CurrentCompanyId)
        {
            return NotFound(new { code = "Salesperson.NotFound", message = "لم يتم العثور على البائع المحدد" });
        }

        if (request.UserId.HasValue && !await UserBelongsToTenantAsync(request.UserId.Value, CurrentCompanyId, cancellationToken))
        {
            return BadRequest(new { code = "User.NotInTenant", message = "المستخدم المحدد لا ينتمي لهذه الشركة" });
        }

        sp.UpdateDetails(
            request.NameAr,
            request.NameEn,
            request.WarehouseCode,
            request.WarehouseNameAr,
            request.UserId,
            request.UserName,
            request.PhoneNumber,
            request.Email,
            request.BranchId,
            request.CommissionRate,
            request.IsActive,
            request.CanGiveDiscount,
            request.MaxDiscountPercent,
            request.CanSellCredit,
            request.CanEditPrice,
            request.CanProcessReturns,
            request.CanSellBelowCost,
            request.CanViewCostPrice,
            request.CanSellFromAnyWarehouse,
            sp.PermissionsJson,
            _tenant.UserName ?? "Admin",
            request.DepartmentName,
            request.DepartmentNameEn);

        await _salespersonRepo.SaveChangesAsync(cancellationToken);
        return Ok(MapToDto(sp));
    }

    /// <summary>
    /// تعطيل أو تفعيل البائع
    /// </summary>
    [HttpPatch("{id:guid}/toggle-active")]
    [Authorize(Roles = AppRoles.Admins)]
    public async Task<IActionResult> ToggleActive([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var sp = await _salespersonRepo.GetByIdAsync(id, cancellationToken);
        if (sp == null || sp.CompanyId != CurrentCompanyId)
        {
            return NotFound(new { code = "Salesperson.NotFound", message = "لم يتم العثور على البائع المحدد" });
        }

        if (sp.IsActive) sp.Deactivate();
        else sp.Activate();

        await _salespersonRepo.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, isActive = sp.IsActive });
    }

    private async Task<bool> UserBelongsToTenantAsync(Guid userId, Guid companyId, CancellationToken cancellationToken)
    {
        var users = await _userRepo.GetUsersByTenantAsync(companyId, cancellationToken);
        return users.Any(u => u.Id == userId);
    }

    private static SalespersonDto MapToDto(Salesperson s)
    {
        return new SalespersonDto(
            s.Id,
            s.CompanyId,
            s.Code,
            s.NameAr,
            s.NameEn,
            s.PhoneNumber,
            s.Email,
            s.UserId,
            s.UserName,
            s.WarehouseCode,
            s.WarehouseNameAr,
            s.BranchId,
            s.CommissionRate,
            s.IsActive,
            s.CreatedAtUtc,
            s.CanGiveDiscount,
            s.MaxDiscountPercent,
            s.CanSellCredit,
            s.CanEditPrice,
            s.CanProcessReturns,
            s.CanSellBelowCost,
            s.CanViewCostPrice,
            s.CanSellFromAnyWarehouse,
            null,
            s.DepartmentName,
            s.DepartmentNameEn);
    }
}
