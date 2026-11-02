using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Shared.Application.Events;

/// <summary>
/// Domain / Integration event published whenever a new company / subscriber tenant is created
/// in the system. Triggers automatic provisioning of the financial workspace (COA, settings, FY, default partners).
/// </summary>
public record CompanyCreatedEvent(
    Guid TenantId,
    Guid CompanyId,
    string Code,
    string NameAr,
    string NameEn,
    string CurrencyCode) : IDomainEvent, INotification;
