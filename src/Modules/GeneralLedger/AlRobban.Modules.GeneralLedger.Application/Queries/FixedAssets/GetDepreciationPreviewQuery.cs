using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FixedAssets;

public record GetDepreciationPreviewQuery(
    Guid? CompanyId = null,
    DateTime? TargetDate = null) : IRequest<Result<DepreciationPreviewDto>>;

public class GetDepreciationPreviewQueryHandler : IRequestHandler<GetDepreciationPreviewQuery, Result<DepreciationPreviewDto>>
{
    private readonly IFixedAssetRepository _assetRepo;

    public GetDepreciationPreviewQueryHandler(IFixedAssetRepository assetRepo)
    {
        _assetRepo = assetRepo;
    }

    public async Task<Result<DepreciationPreviewDto>> Handle(GetDepreciationPreviewQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var targetDate = request.TargetDate ?? DateTime.UtcNow.Date;

        var eligibleAssets = await _assetRepo.GetActiveForDepreciationAsync(companyId, targetDate, cancellationToken);

        var items = new List<DepreciationPreviewItemDto>();

        foreach (var asset in eligibleAssets)
        {
            var monthlyAmount = asset.CalculateMonthlyDepreciation();
            if (monthlyAmount <= 0) continue;

            var newBookValue = Math.Max(asset.SalvageValue, asset.CurrentBookValue - monthlyAmount);

            items.Add(new DepreciationPreviewItemDto(
                asset.Id,
                asset.AssetCode,
                asset.NameAr,
                asset.AcquisitionCost,
                asset.CurrentBookValue,
                monthlyAmount,
                newBookValue,
                asset.DepreciationExpenseAccount?.AccountCode ?? "",
                asset.DepreciationExpenseAccount?.NameAr ?? "",
                asset.AccumulatedDepreciationAccount?.AccountCode ?? "",
                asset.AccumulatedDepreciationAccount?.NameAr ?? ""));
        }

        var totalDepreciation = items.Sum(i => i.MonthlyDepreciationAmount);

        return Result.Success(new DepreciationPreviewDto(
            targetDate,
            items.Count,
            totalDepreciation,
            items));
    }
}
