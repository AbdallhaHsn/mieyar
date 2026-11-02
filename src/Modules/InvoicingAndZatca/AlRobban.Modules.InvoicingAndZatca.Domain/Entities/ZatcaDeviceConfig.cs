using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

public class ZatcaDeviceConfig : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string DeviceUuid { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public string Environment { get; set; } = "Simulation"; // Sandbox, Simulation, Production
    public string OrganizationName { get; set; } = string.Empty;
    public string OrganizationVatNumber { get; set; } = string.Empty;
    public string CommonName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string InvoiceType { get; set; } = "1100"; // 1100 = Standard & Simplified
    
    public string? Otp { get; set; }
    public string? PrivateKeyPem { get; set; }
    public string? PublicKeyPem { get; set; }
    public string? CsrPem { get; set; }
    
    // Compliance CSID (CCSID)
    public string? ComplianceCsid { get; set; }
    public string? ComplianceSecret { get; set; }
    public string? ComplianceRequestId { get; set; }
    public bool CompliancePassed { get; set; }
    public DateTime? ComplianceCheckedAtUtc { get; set; }
    
    // Production CSID (PCSID)
    public string? ProductionCsid { get; set; }
    public string? ProductionSecret { get; set; }
    public string? ProductionRequestId { get; set; }
    public DateTime? ProductionIssuedAtUtc { get; set; }
    public DateTime? ProductionExpiresAtUtc { get; set; }
    
    public string Status { get; set; } = "NotConfigured"; // NotConfigured, CsrGenerated, CompliancePassed, ProductionActive
    
    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public ZatcaDeviceConfig() { }

    public static ZatcaDeviceConfig Create(
        Guid tenantId,
        Guid companyId,
        Guid? branchId,
        string deviceUuid,
        string deviceName,
        string environment,
        string orgName,
        string vatNumber,
        string commonName,
        string location,
        string industry,
        string invoiceType = "1100")
    {
        return new ZatcaDeviceConfig
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            BranchId = branchId,
            DeviceUuid = deviceUuid,
            DeviceName = deviceName,
            Environment = environment,
            OrganizationName = orgName,
            OrganizationVatNumber = vatNumber,
            CommonName = commonName,
            Location = location,
            Industry = industry,
            InvoiceType = invoiceType,
            Status = "NotConfigured",
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
