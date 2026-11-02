using AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;
using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Application.Queries.GetCompanies;
using AlRobban.WebAPI.Security;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[SkipTenantEnforcement]
public class CompaniesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CompaniesController(IMediator mediator)
    {
        _mediator = mediator;
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

        // Fallback for platform SuperAdmin without tenant claim
        var fallback = result.Value.FirstOrDefault(c => c.IsActive) ?? result.Value.First();
        return Ok(fallback);
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
            var all = await _mediator.Send(new GetAllCompaniesQuery(), cancellationToken);
            var active = all.Value?.FirstOrDefault(c => c.IsActive) ?? all.Value?.FirstOrDefault();
            if (active != null) targetCompanyId = active.Id;
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
}

public record UpdateCompanyStatusRequest(bool IsActive);

public record UpdateCompanyProfileRequest(
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string? LogoUrl = null,
    string? BrandThemeColor = "#0f766e",
    NationalAddressDto? Address = null);


