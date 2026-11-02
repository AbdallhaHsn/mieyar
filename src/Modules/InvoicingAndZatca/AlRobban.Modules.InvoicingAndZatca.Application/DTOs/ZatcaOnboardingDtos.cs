namespace AlRobban.Modules.InvoicingAndZatca.Application.DTOs;

public record ZatcaOnboardingStatusDto(
    Guid ConfigId,
    Guid CompanyId,
    Guid? BranchId,
    string DeviceUuid,
    string DeviceName,
    string Environment,
    string OrganizationName,
    string OrganizationVatNumber,
    string CommonName,
    string Location,
    string Industry,
    string InvoiceType,
    string Status, // NotConfigured, CsrGenerated, CompliancePassed, ProductionActive
    bool HasPrivateKey,
    bool HasCsr,
    string? CsrPem,
    string? PublicKeyPem,
    string? ComplianceCsid,
    bool CompliancePassed,
    DateTime? ComplianceCheckedAtUtc,
    string? ProductionCsid,
    DateTime? ProductionIssuedAtUtc,
    DateTime? ProductionExpiresAtUtc,
    int CurrentStep // 1: Setup & CSR, 2: OTP & Compliance, 3: Compliance Checks, 4: Production CSID
);

public record GenerateCsrRequest(
    Guid? CompanyId,
    Guid? BranchId,
    string DeviceName,
    string Environment, // Simulation, Production, Sandbox
    string OrganizationName,
    string OrganizationVatNumber,
    string CommonName,
    string Location,
    string Industry,
    string InvoiceType = "1100" // 1100: Both Standard & Simplified
);

public record GenerateCsrResponse(
    string DeviceUuid,
    string PrivateKeyPem,
    string PublicKeyPem,
    string CsrPem,
    string Status
);

public record RequestComplianceCsidRequest(
    Guid? CompanyId,
    string DeviceUuid,
    string Otp
);

public record ComplianceCsidResponse(
    string BinarySecurityToken,
    string Secret,
    string RequestId,
    string Status,
    bool Success,
    string Message
);

public record RunComplianceChecksRequest(
    Guid? CompanyId,
    string DeviceUuid
);

public record ComplianceChecksResultDto(
    bool StandardInvoicePassed,
    bool SimplifiedInvoicePassed,
    bool CreditNotePassed,
    bool DebitNotePassed,
    bool OverallPassed,
    DateTime CheckedAtUtc,
    List<string> CheckLogs
);

public record RequestProductionCsidRequest(
    Guid? CompanyId,
    string DeviceUuid
);

public record ProductionCsidResponse(
    string ProductionCertificate,
    string ProductionSecret,
    string ProductionRequestId,
    DateTime IssuedAtUtc,
    DateTime ExpiresAtUtc,
    string Status,
    bool Success,
    string Message
);
