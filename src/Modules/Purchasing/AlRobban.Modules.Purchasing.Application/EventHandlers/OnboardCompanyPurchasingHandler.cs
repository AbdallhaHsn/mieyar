using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Application.Events;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.EventHandlers;

/// <summary>
/// Automatically provisions starter inventory / catalog items when a new company / subscriber tenant is registered.
/// </summary>
public class OnboardCompanyPurchasingHandler : INotificationHandler<CompanyCreatedEvent>
{
    private readonly IItemRepository _itemRepository;

    public OnboardCompanyPurchasingHandler(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task Handle(CompanyCreatedEvent notification, CancellationToken cancellationToken)
    {
        var exists = await _itemRepository.ExistsCodeAsync(notification.CompanyId, "SERV-001", null, cancellationToken);
        if (!exists)
        {
            var defaultItem = Item.Create(
                notification.TenantId,
                notification.CompanyId,
                "SERV-001",
                "خدمات عامة واستشارات",
                "General Services & Consulting",
                ItemType.Service,
                "خدمة",
                purchasePrice: 0m,
                salePrice: 100m,
                costPrice: 0m,
                barcode: null,
                inventoryAccountId: null,
                cogsAccountId: null,
                revenueAccountId: null,
                minStockLevel: 0m,
                createdBy: "SystemOnboarding");

            await _itemRepository.AddAsync(defaultItem, cancellationToken);
            await _itemRepository.SaveChangesAsync(cancellationToken);
        }
    }
}
