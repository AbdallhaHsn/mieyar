using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Queries.Pos;

public record GetPosFastItemsQuery(
    Guid CompanyId,
    string? SearchTerm = null
) : IRequest<Result<List<PosFastItemDto>>>;

public class GetPosFastItemsQueryHandler : IRequestHandler<GetPosFastItemsQuery, Result<List<PosFastItemDto>>>
{
    private readonly IItemRepository _itemRepo;

    public GetPosFastItemsQueryHandler(IItemRepository itemRepo)
    {
        _itemRepo = itemRepo;
    }

    public async Task<Result<List<PosFastItemDto>>> Handle(GetPosFastItemsQuery request, CancellationToken cancellationToken)
    {
        var items = await _itemRepo.GetListAsync(request.CompanyId, null, request.SearchTerm, activeOnly: true, cancellationToken);

        if (!items.Any() && string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            // Fallback list of default retail/fast-sale items for immediate POS testing
            var defaultItems = new List<PosFastItemDto>
            {
                new(Guid.NewGuid(), "POS-001", "6281001001", "قهوة مختصة مقطرة V60", "Specialty V60 Coffee", 18.00m, 6.00m, "كوب", "مشروبات", 100, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-002", "6281001002", "شاي إنجليزي فاخر", "Premium English Tea", 12.00m, 3.50m, "كوب", "مشروبات", 150, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-003", "6281001003", "كرواسون بالجبنة الفرنسية", "French Cheese Croissant", 14.50m, 5.00m, "قطعة", "مخبوزات", 45, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-004", "6281001004", "ساندويتش حلومي مشوي", "Grilled Halloumi Sandwich", 24.00m, 9.00m, "وجبة", "سندوتشات", 30, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-005", "6281001005", "مياه معدنية طبيعية 330 مل", "Natural Mineral Water 330ml", 3.00m, 0.85m, "حبة", "مشروبات", 200, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-006", "6281001006", "كابل شاحن سريع Type-C", "Fast Charging Cable Type-C", 45.00m, 18.00m, "قطعة", "إلكترونيات", 50, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-007", "6281001007", "شاحن جداري 30 واط PD", "Wall Charger 30W PD", 85.00m, 35.00m, "قطعة", "إلكترونيات", 25, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-008", "6281001008", "دفتر ملاحظات جلدي فاخر", "Leather Bound Notebook", 35.00m, 12.00m, "دفتر", "قرطاسية", 60, "WH-MAIN"),
                new(Guid.NewGuid(), "POS-009", "6281001009", "استشارة فنية متخصصة (ساعة)", "Specialized Tech Consultation", 350.00m, 100.00m, "ساعة", "خدمات", 999, "WH-MAIN")
            };
            return Result.Success(defaultItems);
        }

        var dtos = items.Select(item => new PosFastItemDto(
            item.Id,
            item.ItemCode,
            item.Barcode,
            item.NameAr,
            item.NameEn,
            item.SalePrice,
            item.CostPrice,
            item.UnitOfMeasure,
            item.ItemType.ToString(),
            item.CurrentStockQuantity,
            "WH-MAIN"
        )).ToList();

        return Result.Success(dtos);
    }
}
