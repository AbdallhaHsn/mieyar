using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Services;

public interface IZatcaOnboardingService
{
    Task<Result<ZatcaOnboardingStatusDto>> GetStatusAsync(Guid companyId, string? deviceUuid = null, CancellationToken cancellationToken = default);
    Task<Result<GenerateCsrResponse>> GenerateCsrAsync(GenerateCsrRequest request, Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task<Result<ComplianceCsidResponse>> RequestComplianceCsidAsync(RequestComplianceCsidRequest request, Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task<Result<ComplianceChecksResultDto>> RunComplianceChecksAsync(RunComplianceChecksRequest request, Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task<Result<ProductionCsidResponse>> RequestProductionCsidAsync(RequestProductionCsidRequest request, Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task<Result<bool>> ResetOnboardingAsync(Guid companyId, string? deviceUuid = null, CancellationToken cancellationToken = default);
}
