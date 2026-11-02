using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/zatca/onboarding")]
[Authorize(Roles = AppRoles.BackOffice)]
public class ZatcaOnboardingController : ControllerBase
{
    private readonly IZatcaOnboardingService _onboardingService;
    private readonly ICurrentTenantContext _tenantContext;

    public ZatcaOnboardingController(
        IZatcaOnboardingService onboardingService,
        ICurrentTenantContext tenantContext)
    {
        _onboardingService = onboardingService;
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// استرجاع حالة الربط الحالية وحالة شهادات الامتثال والإنتاج لمنظومة ZATCA
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(ZatcaOnboardingStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(
        [FromQuery] Guid? companyId,
        [FromQuery] string? deviceUuid,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = companyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var result = await _onboardingService.GetStatusAsync(targetCompanyId, deviceUuid, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// توليد زوج المفاتيح المشفرة (ECDSA secp256k1) وملف طلب التوقيع الرقمي (CSR) لـ ZATCA
    /// </summary>
    [HttpPost("generate-csr")]
    [ProducesResponseType(typeof(GenerateCsrResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateCsr(
        [FromBody] GenerateCsrRequest request,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var tenantId = _tenantContext.TenantId ?? targetCompanyId;

        var result = await _onboardingService.GenerateCsrAsync(request, tenantId, targetCompanyId, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إرسال رمز التحقق OTP الصادر من منصة فاتورة لاستخراج شهادة الامتثال (Compliance CSID)
    /// </summary>
    [HttpPost("request-compliance-csid")]
    [ProducesResponseType(typeof(ComplianceCsidResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestComplianceCsid(
        [FromBody] RequestComplianceCsidRequest request,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var tenantId = _tenantContext.TenantId ?? targetCompanyId;

        var result = await _onboardingService.RequestComplianceCsidAsync(request, tenantId, targetCompanyId, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// تشغيل حزمة الفحوصات الآلية للفواتير والإشعارات لاجتياز اشتراطات الامتثال لـ ZATCA
    /// </summary>
    [HttpPost("run-compliance-checks")]
    [ProducesResponseType(typeof(ComplianceChecksResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunComplianceChecks(
        [FromBody] RunComplianceChecksRequest request,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var tenantId = _tenantContext.TenantId ?? targetCompanyId;

        var result = await _onboardingService.RunComplianceChecksAsync(request, tenantId, targetCompanyId, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إصدار وتفعيل شهادة الإنتاج الرسمية (Production CSID) للربط الحي والفوترة المباشرة
    /// </summary>
    [HttpPost("request-production-csid")]
    [ProducesResponseType(typeof(ProductionCsidResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestProductionCsid(
        [FromBody] RequestProductionCsidRequest request,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var tenantId = _tenantContext.TenantId ?? targetCompanyId;

        var result = await _onboardingService.RequestProductionCsidAsync(request, tenantId, targetCompanyId, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إعادة ضبط إعدادات التهيئة لحل ZATCA والبدء من جديد
    /// </summary>
    [HttpPost("reset")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reset(
        [FromBody] ResetZatcaRequest request,
        CancellationToken cancellationToken)
    {
        var targetCompanyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Empty;
        var result = await _onboardingService.ResetOnboardingAsync(targetCompanyId, request.DeviceUuid, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(new { success = true });
    }
}

public record ResetZatcaRequest(Guid? CompanyId, string? DeviceUuid);
