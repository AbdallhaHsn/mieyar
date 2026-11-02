namespace AlRobban.WebAPI.Security;

/// <summary>Role names carried in the JWT (ClaimTypes.Role).</summary>
public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string CompanyAdmin = "CompanyAdmin";
    public const string Accountant = "Accountant";
    public const string FinancialAuditor = "FinancialAuditor";
    public const string Salesperson = "Salesperson";

    /// <summary>Platform owner or tenant administrators.</summary>
    public const string Admins = SuperAdmin + "," + CompanyAdmin;

    /// <summary>Back-office staff (everyone except salespersons).</summary>
    public const string BackOffice = SuperAdmin + "," + CompanyAdmin + "," + Accountant + "," + FinancialAuditor;
}
