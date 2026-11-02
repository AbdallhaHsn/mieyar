using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/companies/{companyId:guid}/branches")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public BranchesController(ICompanyRepository companyRepository, ICurrentTenantContext tenantContext)
    {
        _companyRepository = companyRepository;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetBranches(Guid companyId, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة / Company not found." });
        }

        var branches = company.Branches.Select(b => new
        {
            b.Id,
            CompanyId = company.Id,
            b.Code,
            b.NameAr,
            b.NameEn,
            b.IsMainBranch,
            b.IsActive,
            City = b.Address != null ? b.Address.CityName : "",
            Address = b.Address != null 
                ? $"{b.Address.StreetName} {b.Address.BuildingNumber} {b.Address.SubDivisionName}".Trim() 
                : "",
            FullAddress = b.Address
        }).ToList();

        return Ok(branches);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBranch(Guid companyId, [FromBody] CreateBranchRequest request, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة / Company not found." });
        }

        var code = (string.IsNullOrWhiteSpace(request.Code) ? "BR-01" : request.Code).Trim().ToUpper();
        if (company.Branches.Any(b => b.Code.Equals(code, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict(new { code = "Branch.DuplicateCode", description = $"كود الفرع '{code}' مستخدم مسبقاً لهذه المنشأة." });
        }

        var nationalAddress = request.Address != null
            ? new NationalAddress(
                request.Address.StreetName ?? company.Address.StreetName,
                request.Address.BuildingNumber ?? company.Address.BuildingNumber,
                request.Address.SubDivisionName ?? company.Address.SubDivisionName,
                request.Address.CityName ?? company.Address.CityName,
                request.Address.PostalZone ?? company.Address.PostalZone,
                request.Address.AdditionalNumber ?? company.Address.AdditionalNumber,
                request.Address.CountryCode ?? company.Address.CountryCode)
            : company.Address;

        var nameAr = (string.IsNullOrWhiteSpace(request.NameAr) ? $"فرع {code}" : request.NameAr).Trim();
        var nameEn = (string.IsNullOrWhiteSpace(request.NameEn) ? $"Branch {code}" : request.NameEn).Trim();

        var branch = company.AddBranch(code, nameAr, nameEn, request.IsMainBranch, nationalAddress);
        await _companyRepository.AddBranchAsync(branch, cancellationToken);
        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Created($"/api/companies/{companyId}/branches/{branch.Id}", new
        {
            branch.Id,
            CompanyId = company.Id,
            branch.Code,
            branch.NameAr,
            branch.NameEn,
            branch.IsMainBranch,
            branch.IsActive,
            Address = new
            {
                branch.Address.StreetName,
                branch.Address.BuildingNumber,
                branch.Address.SubDivisionName,
                branch.Address.CityName,
                branch.Address.PostalZone,
                branch.Address.AdditionalNumber,
                branch.Address.CountryCode
            }
        });
    }

    [HttpPut("{branchId:guid}/status")]
    public async Task<IActionResult> ToggleBranchStatus(Guid companyId, Guid branchId, [FromBody] ToggleBranchStatusRequest request, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });
        }

        var branch = company.Branches.FirstOrDefault(b => b.Id == branchId);
        if (branch == null)
        {
            return NotFound(new { code = "Branch.NotFound", description = "الفرع غير موجود." });
        }

        if (request.IsActive)
        {
            branch.Activate();
        }
        else
        {
            if (branch.IsMainBranch)
            {
                return BadRequest(new { code = "Branch.CannotDeactivateMain", description = "لا يمكن تعطيل الفرع الرئيسي للمنشأة." });
            }
            branch.Deactivate();
        }

        await _companyRepository.SaveChangesAsync(cancellationToken);
        return Ok(new { branchId, isActive = branch.IsActive });
    }

    [HttpPut("{branchId:guid}")]
    public async Task<IActionResult> UpdateBranch(Guid companyId, Guid branchId, [FromBody] UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });
        }

        var branch = company.Branches.FirstOrDefault(b => b.Id == branchId);
        if (branch == null)
        {
            return NotFound(new { code = "Branch.NotFound", description = "الفرع غير موجود." });
        }

        var address = request.Address != null
            ? new NationalAddress(
                request.Address.StreetName ?? branch.Address.StreetName,
                request.Address.BuildingNumber ?? branch.Address.BuildingNumber,
                request.Address.SubDivisionName ?? branch.Address.SubDivisionName,
                request.Address.CityName ?? branch.Address.CityName,
                request.Address.PostalZone ?? branch.Address.PostalZone,
                request.Address.AdditionalNumber ?? branch.Address.AdditionalNumber,
                request.Address.CountryCode ?? branch.Address.CountryCode)
            : branch.Address;

        var nameAr = (string.IsNullOrWhiteSpace(request.NameAr) ? branch.NameAr : request.NameAr).Trim();
        var nameEn = (string.IsNullOrWhiteSpace(request.NameEn) ? branch.NameEn : request.NameEn).Trim();

        branch.UpdateDetails(nameAr, nameEn, address);

        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            branch.Id,
            CompanyId = company.Id,
            branch.Code,
            branch.NameAr,
            branch.NameEn,
            branch.IsMainBranch,
            branch.IsActive,
            City = branch.Address?.CityName ?? "",
            Address = branch.Address != null 
                ? $"{branch.Address.StreetName} {branch.Address.BuildingNumber} {branch.Address.SubDivisionName}".Trim() 
                : ""
        });
    }

    [HttpDelete("{branchId:guid}")]
    public async Task<IActionResult> DeleteBranch(Guid companyId, Guid branchId, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
        {
            return NotFound(new { code = "Company.NotFound", description = "الشركة غير موجودة." });
        }

        var branch = company.Branches.FirstOrDefault(b => b.Id == branchId);
        if (branch == null)
        {
            return NotFound(new { code = "Branch.NotFound", description = "الفرع غير موجود." });
        }

        if (branch.IsMainBranch)
        {
            return BadRequest(new { code = "Branch.CannotDeleteMain", description = "لا يمكن حذف الفرع الرئيسي للمنشأة." });
        }

        company.RemoveBranch(branchId);
        await _companyRepository.RemoveBranchAsync(branch, cancellationToken);
        await _companyRepository.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "تم حذف الفرع بنجاح." });
    }
}

public record UpdateBranchRequest(
    string NameAr,
    string NameEn,
    BranchAddressRequest? Address);

public record CreateBranchRequest(
    string Code,
    string NameAr,
    string NameEn,
    bool IsMainBranch,
    BranchAddressRequest? Address);

public record BranchAddressRequest(
    string? StreetName,
    string? BuildingNumber,
    string? SubDivisionName,
    string? CityName,
    string? PostalZone,
    string? AdditionalNumber,
    string? CountryCode = "SA");

public record ToggleBranchStatusRequest(bool IsActive);
