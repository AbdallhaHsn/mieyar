using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Security;

public enum LicenseResource
{
    Users,
    Warehouses,
    Branches
}

public sealed record LicenseCheckResult(bool Allowed, string? Code = null, string? Description = null, int? Limit = null, string? Resource = null)
{
    public static readonly LicenseCheckResult Ok = new(true);

    /// <summary>Error body: Arabic description for logs/legacy clients plus machine-readable code/limit/resource for localization.</summary>
    public object ToResponse() => new { code = Code, description = Description, limit = Limit, resource = Resource };
}

/// <summary>
/// Enforces the license limits set by the platform owner (SuperAdmin) on each tenant company,
/// and the platform-wide cap on the number of companies (Licensing:MaxCompanies, 0/absent = unlimited).
/// </summary>
public interface ILicenseService
{
    Task<LicenseCheckResult> CheckCanAddAsync(Guid companyId, LicenseResource resource, int currentCount, CancellationToken ct);
    Task<LicenseCheckResult> CheckCanAddCompanyAsync(CancellationToken ct);
}

public sealed class LicenseService : ILicenseService
{
    private readonly IdentityAndAccessDbContext _db;
    private readonly IConfiguration _config;

    public LicenseService(IdentityAndAccessDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LicenseCheckResult> CheckCanAddAsync(Guid companyId, LicenseResource resource, int currentCount, CancellationToken ct)
    {
        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
        {
            return new LicenseCheckResult(false, "License.CompanyNotFound", "الشركة غير موجودة.");
        }

        if (company.IsLicenseExpired)
        {
            return new LicenseCheckResult(false, "License.Expired", "انتهى ترخيص الشركة. يرجى التواصل مع الجهة المالكة للنظام لتجديده.");
        }

        var (limit, label, key) = resource switch
        {
            LicenseResource.Users => (company.MaxUsers, "المستخدمين", "users"),
            LicenseResource.Warehouses => (company.MaxWarehouses, "المستودعات", "warehouses"),
            _ => (company.MaxBranches, "الفروع", "branches")
        };

        if (limit.HasValue && currentCount >= limit.Value)
        {
            return new LicenseCheckResult(false, "License.LimitReached",
                $"تم بلوغ الحد الأقصى المسموح به في الترخيص لعدد {label} ({limit.Value}). يرجى ترقية الترخيص.",
                limit.Value, key);
        }

        return LicenseCheckResult.Ok;
    }

    public async Task<LicenseCheckResult> CheckCanAddCompanyAsync(CancellationToken ct)
    {
        var max = _config.GetValue<int?>("Licensing:MaxCompanies");
        if (!max.HasValue || max.Value <= 0) return LicenseCheckResult.Ok;

        var count = await _db.Companies.CountAsync(ct);
        return count >= max.Value
            ? new LicenseCheckResult(false, "License.CompanyLimitReached",
                $"تم بلوغ الحد الأقصى لعدد الشركات المسموح به في ترخيص المنصة ({max.Value}).", max.Value, "companies")
            : LicenseCheckResult.Ok;
    }
}
