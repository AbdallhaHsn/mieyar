namespace AlRobban.WebAPI.Security;

/// <summary>Role names carried in the JWT (ClaimTypes.Role).</summary>
public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string CompanyAdmin = "CompanyAdmin";
    public const string Accountant = "Accountant";
    public const string FinancialAuditor = "FinancialAuditor";
    public const string Salesperson = "Salesperson";

    /// <summary>Tenant administrators. The platform owner (SuperAdmin) is deliberately excluded: it manages companies/licenses only.</summary>
    public const string Admins = CompanyAdmin;

    /// <summary>Back-office staff (everyone except salespersons and the platform owner).</summary>
    public const string BackOffice = CompanyAdmin + "," + Accountant + "," + FinancialAuditor;
}
