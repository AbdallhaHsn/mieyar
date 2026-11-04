using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using AlRobban.Modules.IdentityAndAccess.Application.Commands.Login;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using AlRobban.WebAPI.Security;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IdentityAndAccessDbContext _db;
    private readonly IPasswordHasher _passwordHasher;

    // In-memory OTP storage for password recovery (Valid for 15 minutes)
    private static readonly ConcurrentDictionary<string, (string Otp, DateTime Expiry)> _resetCodes = new();

    public AuthController(
        IMediator mediator,
        IdentityAndAccessDbContext db,
        IPasswordHasher passwordHasher)
    {
        _mediator = mediator;
        _db = db;
        _passwordHasher = passwordHasher;
    }

    [AllowAnonymous]
    [SkipTenantEnforcement]
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// طلب رمز استعادة كلمة المرور
    /// </summary>
    [AllowAnonymous]
    [SkipTenantEnforcement]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.UserNameOrEmail))
        {
            return BadRequest(new { code = "Data.Required", description = "يرجى إدخال اسم المستخدم أو البريد الإلكتروني." });
        }

        var normalized = request.UserNameOrEmail.Trim().ToLowerInvariant();
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.UserName == normalized || u.Email == normalized, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return NotFound(new { code = "User.NotFound", description = "لم يتم العثور على حساب نشط يطابق البيانات المدخلة." });
        }

        // Generate 6-digit OTP code (Valid 15 minutes)
        var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var expiry = DateTime.UtcNow.AddMinutes(15);
        _resetCodes[user.UserName] = (otp, expiry);
        _resetCodes[user.Email] = (otp, expiry);

        var maskedEmail = MaskEmail(user.Email);

        return Ok(new
        {
            success = true,
            userName = user.UserName,
            maskedEmail,
            otp, // Returned for instant UX feedback in development/simulation
            message = $"تم إنشاء رمز استعادة كلمة المرور ({otp}) للبريد {maskedEmail}."
        });
    }

    /// <summary>
    /// التحقق من رمز الاستعادة وتعيين كلمة المرور الجديدة
    /// </summary>
    [AllowAnonymous]
    [SkipTenantEnforcement]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.UserNameOrEmail) || 
            string.IsNullOrWhiteSpace(request?.Otp) || 
            string.IsNullOrWhiteSpace(request?.NewPassword))
        {
            return BadRequest(new { code = "Data.Required", description = "اسم المستخدم، رمز التحقق، وكلمة المرور الجديدة كلها حقول مطلوبة." });
        }

        if (request.NewPassword.Trim().Length < 6)
        {
            return BadRequest(new { code = "Password.TooShort", description = "كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف." });
        }

        var normalized = request.UserNameOrEmail.Trim().ToLowerInvariant();
        if (!_resetCodes.TryGetValue(normalized, out var entry) || entry.Expiry < DateTime.UtcNow || entry.Otp != request.Otp.Trim())
        {
            return BadRequest(new { code = "Otp.Invalid", description = "رمز التحقق غير صحيح أو انتهت صلاحيته." });
        }

        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.UserName == normalized || u.Email == normalized, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return NotFound(new { code = "User.NotFound", description = "الحساب غير موجود أو غير نشط." });
        }

        var hash = _passwordHasher.HashPassword(request.NewPassword.Trim());
        user.ChangePassword(hash, "SelfService");
        await _db.SaveChangesAsync(cancellationToken);

        _resetCodes.TryRemove(normalized, out _);
        _resetCodes.TryRemove(user.UserName, out _);
        _resetCodes.TryRemove(user.Email, out _);

        return Ok(new
        {
            success = true,
            userName = user.UserName,
            message = "تمت إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بها."
        });
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        return Ok(new
        {
            UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            UserName = User.FindFirst(ClaimTypes.Name)?.Value,
            Email = User.FindFirst(ClaimTypes.Email)?.Value,
            Role = User.FindFirst(ClaimTypes.Role)?.Value,
            TenantId = User.FindFirst("tenant_id")?.Value,
            CompanyCode = User.FindFirst("company_code")?.Value,
            CompanyNameAr = User.FindFirst("company_name_ar")?.Value,
            CompanyNameEn = User.FindFirst("company_name_en")?.Value,
            CompanyLogo = User.FindFirst("company_logo")?.Value,
            BrandColor = User.FindFirst("brand_color")?.Value
        });
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return email;
        var parts = email.Split('@');
        var name = parts[0];
        var domain = parts[1];
        if (name.Length <= 2) return $"{name}*@{domain}";
        return $"{name[..2]}****@{domain}";
    }
}

public record ForgotPasswordRequest(string UserNameOrEmail);
public record ResetPasswordRequest(string UserNameOrEmail, string Otp, string NewPassword);
