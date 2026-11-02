using System.Text.Json;
using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/iam")]
[Authorize]
public class UsersAndRolesController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly ICompanyRoleRepository _roleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IdentityAndAccessDbContext _dbContext;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly ILogger<UsersAndRolesController> _logger;

    public UsersAndRolesController(
        IUserRepository userRepository,
        ICompanyRoleRepository roleRepository,
        IPasswordHasher passwordHasher,
        IdentityAndAccessDbContext dbContext,
        ICurrentTenantContext tenantContext,
        ILogger<UsersAndRolesController> logger)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _passwordHasher = passwordHasher;
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private Guid GetEffectiveTenantId()
    {
        return _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-2222-3333-4444-555555555555");
    }

    // =========================================================================
    // 1. USERS ENDPOINTS (إدارة مستخدمي الشركة)
    // =========================================================================

    [HttpGet("users")]
    [ProducesResponseType(typeof(List<CompanyUserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();

        var users = await _dbContext.Users
            .Where(u => u.TenantId == tenantId)
            .OrderByDescending(u => u.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var roles = await _roleRepository.GetRolesByTenantAsync(tenantId, cancellationToken);
        var branches = await _dbContext.Branches
            .Where(b => b.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var result = users.Select(u =>
        {
            var r = u.CompanyRoleId.HasValue ? roles.FirstOrDefault(x => x.Id == u.CompanyRoleId.Value) : null;
            var b = u.BranchId.HasValue ? branches.FirstOrDefault(x => x.Id == u.BranchId.Value) : null;

            return new CompanyUserDto(
                Id: u.Id,
                TenantId: u.TenantId,
                UserName: u.UserName,
                Email: u.Email,
                FullNameAr: u.FullNameAr,
                FullNameEn: u.FullNameEn,
                PhoneNumber: u.PhoneNumber,
                Role: u.Role,
                RoleNameAr: GetRoleNameAr(u.Role),
                RoleNameEn: u.Role.ToString(),
                CompanyRoleId: u.CompanyRoleId,
                CompanyRoleCode: r?.Code,
                CompanyRoleNameAr: r?.NameAr,
                CompanyRoleNameEn: r?.NameEn,
                BranchId: u.BranchId,
                BranchNameAr: b?.NameAr,
                BranchNameEn: b?.NameEn,
                IsActive: u.IsActive,
                LastLoginUtc: u.LastLoginUtc,
                CreatedAtUtc: u.CreatedAtUtc
            );
        }).ToList();

        return Ok(result);
    }

    [HttpPost("users")]
    [ProducesResponseType(typeof(CompanyUserDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateUser([FromBody] CreateCompanyUserRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();

        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { code = "Users.InvalidInput", description = "يرجى تعبئة اسم المستخدم، البريد الإلكتروني، وكلمة المرور." });
        }

        if (await _userRepository.ExistsWithUserNameAsync(request.UserName, cancellationToken))
        {
            return BadRequest(new { code = "Users.DuplicateUserName", description = $"اسم المستخدم '{request.UserName}' مسجل مسبقاً في النظام." });
        }

        if (await _userRepository.ExistsWithEmailAsync(request.Email, cancellationToken))
        {
            return BadRequest(new { code = "Users.DuplicateEmail", description = $"البريد الإلكتروني '{request.Email}' مسجل مسبقاً في النظام." });
        }

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        var effectiveRole = request.Role;
        if (request.CompanyRoleId.HasValue)
        {
            var compRole = await _roleRepository.GetByIdAsync(request.CompanyRoleId.Value, cancellationToken);
            if (compRole != null)
            {
                effectiveRole = compRole.Code switch
                {
                    "SALES_REP" => UserRole.Salesperson,
                    "COMPANY_ADMIN" => UserRole.CompanyAdmin,
                    "ACCOUNTANT" or "FINANCE_MANAGER" => UserRole.Accountant,
                    "AUDIT_SPECIALIST" => UserRole.FinancialAuditor,
                    _ => request.Role
                };
            }
        }

        var newUser = new User(
            id: Guid.NewGuid(),
            tenantId: tenantId,
            userName: request.UserName,
            email: request.Email,
            passwordHash: passwordHash,
            fullNameAr: request.FullNameAr,
            fullNameEn: request.FullNameEn,
            role: effectiveRole,
            phoneNumber: request.PhoneNumber,
            companyRoleId: request.CompanyRoleId,
            branchId: request.BranchId,
            createdBy: User.Identity?.Name ?? "Admin"
        );

        await _userRepository.AddAsync(newUser, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Company user {UserName} created successfully for tenant {TenantId}", newUser.UserName, tenantId);

        return CreatedAtAction(nameof(GetUsers), new { id = newUser.Id }, new CompanyUserDto(
            Id: newUser.Id,
            TenantId: newUser.TenantId,
            UserName: newUser.UserName,
            Email: newUser.Email,
            FullNameAr: newUser.FullNameAr,
            FullNameEn: newUser.FullNameEn,
            PhoneNumber: newUser.PhoneNumber,
            Role: newUser.Role,
            RoleNameAr: GetRoleNameAr(newUser.Role),
            RoleNameEn: newUser.Role.ToString(),
            CompanyRoleId: newUser.CompanyRoleId,
            CompanyRoleCode: null,
            CompanyRoleNameAr: null,
            CompanyRoleNameEn: null,
            BranchId: newUser.BranchId,
            BranchNameAr: null,
            BranchNameEn: null,
            IsActive: newUser.IsActive,
            LastLoginUtc: null,
            CreatedAtUtc: newUser.CreatedAtUtc
        ));
    }

    [HttpPut("users/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateCompanyUserRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { code = "Users.NotFound", description = "المستخدم المطلوب غير موجود." });
        }

        var effectiveRole = request.Role;
        if (request.CompanyRoleId.HasValue)
        {
            var compRole = await _roleRepository.GetByIdAsync(request.CompanyRoleId.Value, cancellationToken);
            if (compRole != null)
            {
                effectiveRole = compRole.Code switch
                {
                    "SALES_REP" => UserRole.Salesperson,
                    "COMPANY_ADMIN" => UserRole.CompanyAdmin,
                    "ACCOUNTANT" or "FINANCE_MANAGER" => UserRole.Accountant,
                    "AUDIT_SPECIALIST" => UserRole.FinancialAuditor,
                    _ => request.Role
                };
            }
        }

        user.UpdateDetails(
            fullNameAr: request.FullNameAr,
            fullNameEn: request.FullNameEn,
            phoneNumber: request.PhoneNumber,
            role: effectiveRole,
            companyRoleId: request.CompanyRoleId,
            branchId: request.BranchId,
            modifiedBy: User.Identity?.Name ?? "Admin"
        );

        user.SetStatus(request.IsActive, User.Identity?.Name ?? "Admin");

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "تم تحديث بيانات المستخدم بنجاح." });
    }

    [HttpPost("users/{id:guid}/reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetUserPasswordRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { code = "Users.NotFound", description = "المستخدم المطلوب غير موجود." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { code = "Users.WeakPassword", description = "كلمة المرور يجب أن لا تقل عن 6 خانات." });
        }

        var newHash = _passwordHasher.HashPassword(request.NewPassword);
        user.ChangePassword(newHash, User.Identity?.Name ?? "Admin");

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "تم إعادة تعيين كلمة المرور بنجاح." });
    }

    [HttpPatch("users/{id:guid}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleUserStatusRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { code = "Users.NotFound", description = "المستخدم المطلوب غير موجود." });
        }

        user.SetStatus(request.IsActive, User.Identity?.Name ?? "Admin");
        await _dbContext.SaveChangesAsync(cancellationToken);

        var statusDesc = request.IsActive ? "تنشيط" : "تعطيل";
        return Ok(new { success = true, message = $"تم {statusDesc} حساب المستخدم بنجاح." });
    }

    // =========================================================================
    // 2. ROLES & PERMISSIONS ENDPOINTS (إدارة الأدوار ومصفوفة الصلاحيات)
    // =========================================================================

    [HttpGet("roles")]
    [ProducesResponseType(typeof(List<CompanyRoleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var roles = await _roleRepository.GetRolesByTenantAsync(tenantId, cancellationToken);

        // Calculate assigned user counts per role
        var counts = await _dbContext.Users
            .Where(u => u.TenantId == tenantId && u.CompanyRoleId.HasValue)
            .GroupBy(u => u.CompanyRoleId!.Value)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);

        var result = roles.Select(r =>
        {
            List<string> perms = new();
            try
            {
                perms = JsonSerializer.Deserialize<List<string>>(r.PermissionsJson) ?? new List<string>();
            }
            catch { }

            var userCount = counts.TryGetValue(r.Id, out var c) ? c : 0;

            return new CompanyRoleDto(
                Id: r.Id,
                TenantId: r.TenantId,
                Code: r.Code,
                NameAr: r.NameAr,
                NameEn: r.NameEn,
                DescriptionAr: r.DescriptionAr,
                DescriptionEn: r.DescriptionEn,
                IsSystemRole: r.IsSystemRole,
                Permissions: perms,
                AssignedUsersCount: userCount,
                CreatedAtUtc: r.CreatedAtUtc
            );
        }).ToList();

        return Ok(result);
    }

    [HttpGet("roles/permissions-catalog")]
    [ProducesResponseType(typeof(List<PermissionModuleDto>), StatusCodes.Status200OK)]
    public IActionResult GetPermissionsCatalog()
    {
        var catalog = BuildSystemPermissionsCatalog();
        return Ok(catalog);
    }

    [HttpPost("roles")]
    [ProducesResponseType(typeof(CompanyRoleDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.NameAr))
        {
            return BadRequest(new { code = "Roles.InvalidInput", description = "يرجى تعبئة رمز الدور واسمه باللغة العربية." });
        }

        if (await _roleRepository.ExistsWithCodeAsync(tenantId, request.Code, cancellationToken: cancellationToken))
        {
            return BadRequest(new { code = "Roles.DuplicateCode", description = $"رمز الدور '{request.Code}' مستخدم مسبقاً." });
        }

        var permsJson = JsonSerializer.Serialize(request.Permissions ?? new List<string>());

        var role = CompanyRole.Create(
            tenantId: tenantId,
            code: request.Code,
            nameAr: request.NameAr,
            nameEn: string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr : request.NameEn,
            descriptionAr: request.DescriptionAr,
            descriptionEn: request.DescriptionEn,
            permissionsJson: permsJson,
            createdBy: User.Identity?.Name ?? "Admin"
        );

        await _roleRepository.AddAsync(role, cancellationToken);
        await _roleRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Company role {RoleCode} created for tenant {TenantId}", role.Code, tenantId);

        return CreatedAtAction(nameof(GetRoles), new { id = role.Id }, new CompanyRoleDto(
            Id: role.Id,
            TenantId: role.TenantId,
            Code: role.Code,
            NameAr: role.NameAr,
            NameEn: role.NameEn,
            DescriptionAr: role.DescriptionAr,
            DescriptionEn: role.DescriptionEn,
            IsSystemRole: false,
            Permissions: request.Permissions ?? new List<string>(),
            AssignedUsersCount: 0,
            CreatedAtUtc: role.CreatedAtUtc
        ));
    }

    [HttpPut("roles/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var role = await _roleRepository.GetByIdAsync(id, cancellationToken);
        if (role == null || role.TenantId != tenantId)
        {
            return NotFound(new { code = "Roles.NotFound", description = "الدور المطلوب غير موجود." });
        }

        var permsJson = JsonSerializer.Serialize(request.Permissions ?? new List<string>());

        role.Update(
            nameAr: request.NameAr,
            nameEn: string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr : request.NameEn,
            descriptionAr: request.DescriptionAr,
            descriptionEn: request.DescriptionEn,
            permissionsJson: permsJson,
            modifiedBy: User.Identity?.Name ?? "Admin"
        );

        await _roleRepository.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "تم تحديث الدور ومصفوفة الصلاحيات بنجاح." });
    }

    [HttpDelete("roles/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = GetEffectiveTenantId();
        var role = await _roleRepository.GetByIdAsync(id, cancellationToken);
        if (role == null || role.TenantId != tenantId)
        {
            return NotFound(new { code = "Roles.NotFound", description = "الدور المطلوب غير موجود." });
        }

        if (role.IsSystemRole)
        {
            return BadRequest(new { code = "Roles.SystemRoleProtected", description = "لا يمكن حذف الأدوار النظامية الأساسية المعرفة مسبقاً." });
        }

        var hasAssignedUsers = await _dbContext.Users.AnyAsync(u => u.CompanyRoleId == id, cancellationToken);
        if (hasAssignedUsers)
        {
            return BadRequest(new { code = "Roles.RoleInUse", description = "لا يمكن حذف الدور لوجود مستخدمين مسند إليهم هذا الدور حالياً. يرجى إعادة تعيين أدوارهم أولاً." });
        }

        _roleRepository.Remove(role);
        await _roleRepository.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "تم حذف الدور بنجاح." });
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private static string GetRoleNameAr(UserRole role) => role switch
    {
        UserRole.SuperAdmin => "مدير المنصة الشامل",
        UserRole.CompanyAdmin => "مدير الشركة والنظام",
        UserRole.Accountant => "محاسب مالي",
        UserRole.FinancialAuditor => "مراجع مالي ومدقق",
        UserRole.Salesperson => "بائع / كاشير مبيعات",
        _ => "مستخدم نظام"
    };

    private static List<PermissionModuleDto> BuildSystemPermissionsCatalog()
    {
        return new List<PermissionModuleDto>
        {
            new(
                ModuleKey: "gl",
                ModuleNameAr: "المحاسبة العامة ودفتر الأستاذ",
                ModuleNameEn: "General Ledger & Accounting",
                Icon: "pi pi-book",
                Permissions: new List<PermissionItemDto>
                {
                    new("gl.accounts.view", "استعراض دليل وشجرة الحسابات", "View Chart of Accounts", "السماح بالاطلاع على شجرة الحسابات والأرصدة", "Allow browsing COA"),
                    new("gl.accounts.manage", "إدارة وبناء شجرة الحسابات", "Manage Chart of Accounts", "إضافة وتعديل وحذف الحسابات المالية الفرعية", "Create, edit accounts"),
                    new("gl.journals.view", "استعراض القيود اليومية", "View Journal Entries", "الاطلاع على قيود اليومية وحركاتها", "Browse journal vouchers"),
                    new("gl.journals.create", "إنشاء وتعديل القيود", "Create Journal Entries", "إدخال القيود المحاسبية والتسويات", "Draft journal entries"),
                    new("gl.journals.post", "اعتماد وترحيل القيود اليومية", "Post Journal Entries", "ترحيل القيود لدفتر الأستاذ العام وتثبيتها", "Approve and post entries to ledger"),
                    new("gl.reports.view", "التقارير والقوائم المالية", "View Financial Statements", "الاطلاع على الميزانية العمومية، الأرباح والخسائر، وميزان المراجعة", "Access Balance Sheet, P&L, Trial Balance"),
                    new("gl.reconciliation.manage", "إدارة التسويات البنكية", "Bank Reconciliation", "مطابقة كشوف الحسابات البنكية وإدارة الحركات المعلقة", "Reconcile bank accounts"),
                    new("gl.closing.manage", "إقفال وتدوير السنوات المالية", "Year-End Closing", "تشغيل معالج الإقفال السنوي وتدوير الأرصدة الافتتاحية", "Run fiscal year closing wizard")
                }
            ),
            new(
                ModuleKey: "sales",
                ModuleNameAr: "المبيعات والفوترة الإلكترونية (ZATCA)",
                ModuleNameEn: "Sales & E-Invoicing",
                Icon: "pi pi-shopping-bag",
                Permissions: new List<PermissionItemDto>
                {
                    new("sales.invoices.view", "استعراض فواتير المبيعات", "View Sales Invoices", "الاطلاع على فواتير المبيعات الصادرة والمسودات", "Browse sales invoices"),
                    new("sales.invoices.create", "إصدار واعتماد الفواتير الضريبية", "Issue Tax Invoices", "إنشاء الفواتير الضريبية وحساب الضريبة", "Create and finalize tax invoices"),
                    new("sales.notes.manage", "إصدار الإشعارات الدائنة والمدينة", "Issue Credit / Debit Notes", "معالجة المرتجعات والتسويات الضريبية", "Issue credit and debit notes"),
                    new("sales.pos.access", "نظام نقاط البيع السريعة (POS)", "Access POS Cashier", "الدخول لشاشة الكاشير السريع ونقاط البيع", "Operate POS terminals"),
                    new("sales.partners.manage", "إدارة سجل العملاء وإعمار الديون", "Customers & Aging", "إضافة العملاء والحدود الائتمانية وكشف إعمار الديون", "Manage customer profiles"),
                    new("sales.zatca.onboard", "بوابة التهيئة والربط مع ZATCA", "ZATCA Onboarding Portal", "توليد الـ CSR والمفاتيح وطلب شهادات CSID من منصة فاتورة", "Manage ZATCA onboarding & CSID certs"),
                    new("sales.zatca.transmit", "إرسال واعتماد الفواتير لدى هيئة الزكاة", "Live ZATCA Clearance & Reporting", "الربط اللحظي للفواتير والختم الرقمي", "Submit invoices to ZATCA")
                }
            ),
            new(
                ModuleKey: "purchasing",
                ModuleNameAr: "المشتريات وإدارة المخزون والمستودعات",
                ModuleNameEn: "Purchasing & Inventory",
                Icon: "pi pi-box",
                Permissions: new List<PermissionItemDto>
                {
                    new("purchasing.orders.manage", "إدارة أوامر الشراء", "Purchase Orders", "إنشاء واعتماد أوامر الشراء للموردين", "Create & approve purchase orders"),
                    new("purchasing.invoices.manage", "تسجيل فواتير الشراء والتكاليف", "Purchase Invoices", "إدخال فواتير الشراء والخصم الضريبي المدخل", "Record vendor bills"),
                    new("inventory.items.manage", "بطاقات الأصناف والأسعار", "Item Master Data", "إضافة الأصناف، الباركود، والأسعار ووحدات القياس", "Manage products & inventory items"),
                    new("inventory.warehouses.manage", "إدارة المستودعات والتحويلات", "Warehouses & Stock Transfers", "إدارة المستودعات والتحويل المخزني بين الفروع", "Manage warehouses & transfers"),
                    new("inventory.adjustments.manage", "الجرد والتسويات المخزنية", "Stock Adjustments & Counts", "تسجيل فروقات الجرد والتسويات المخزنية وتكلفتها", "Perform physical counts & adjustments")
                }
            ),
            new(
                ModuleKey: "hr",
                ModuleNameAr: "الموارد البشرية والرواتب (WPS / مدد)",
                ModuleNameEn: "Human Resources & Payroll",
                Icon: "pi pi-users",
                Permissions: new List<PermissionItemDto>
                {
                    new("hr.employees.manage", "إدارة ملفات الموظفين والعقود", "Employee Master & Contracts", "إضافة الموظفين، الرواتب، والبدلات وبيانات الآيبان", "Manage employee records"),
                    new("hr.payroll.view", "استعراض مسيرات الرواتب", "View Payroll Sheets", "الاطلاع على كشوف الرواتب الشهرية والبدلات", "Browse monthly payroll sheets"),
                    new("hr.payroll.calculate", "احتساب مسير الرواتب الآلي", "Calculate Monthly Payroll", "تشغيل الاحتساب الآلي وحساب اشتراكات التأمينات GOSI", "Calculate payroll & GOSI"),
                    new("hr.payroll.post", "ترحيل مسير الرواتب للحسابات العامة", "Post Payroll to GL", "توليد قيد استحقاق الرواتب في دفتر الأستاذ", "Post payroll vouchers to ledger"),
                    new("hr.wps.export", "تصدير ملف حماية الأجور (SIF)", "Export Mudad / WPS SIF File", "استخراج الملف البنكي المعتمد للرفع على منصة مدد", "Download SAMA compliant WPS SIF")
                }
            ),
            new(
                ModuleKey: "projects",
                ModuleNameAr: "المشاريع وعقود المقاولات",
                ModuleNameEn: "Projects & Contracting",
                Icon: "pi pi-building",
                Permissions: new List<PermissionItemDto>
                {
                    new("projects.manage", "إدارة المشاريع والعقود الإنشائية", "Projects & Contracts", "إضافة المشاريع ومراكز التكلفة وبنود الأعمال", "Manage construction projects"),
                    new("projects.billings.manage", "المستخلصات التراكمية", "Progress Billings", "إعداد واعتماد المستخلصات التراكمية والاستقطاعات", "Progress billings & retentions"),
                    new("projects.guarantees.manage", "خطابات الضمان البنكية", "Letters of Guarantee", "متابعة الضمانات الابتدائية والنهائية وتواريخ استحقاقها", "Manage bank guarantees")
                }
            ),
            new(
                ModuleKey: "admin",
                ModuleNameAr: "إدارة النظام والأمان والصلاحيات",
                ModuleNameEn: "System Administration & Security",
                Icon: "pi pi-shield",
                Permissions: new List<PermissionItemDto>
                {
                    new("admin.users.manage", "إدارة مستخدمي الشركة", "Manage Company Users", "إضافة مستخدمين جدد، تعيين الأدوار، وتعيين كلمات المرور", "Create users, reset passwords"),
                    new("admin.roles.manage", "إدارة الأدوار ومصفوفة الصلاحيات", "Roles & Permissions Matrix", "إنشاء وتخصيص الأدوار وتعيين الصلاحيات الدقيقة", "Customize roles and permissions"),
                    new("admin.company.manage", "بيانات المنشأة والفروع", "Company Profile & Branches", "إدارة الفروع، العملات، وبيانات الهوية للشركة", "Manage company profile & branches")
                }
            )
        };
    }
}
