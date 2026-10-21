using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FixedAssets;

public record GetFixedAssetsQuery(
    Guid? CompanyId = null,
    FixedAssetStatus? Status = null,
    string? SearchTerm = null) : IRequest<Result<List<FixedAssetDto>>>;

public class GetFixedAssetsQueryHandler : IRequestHandler<GetFixedAssetsQuery, Result<List<FixedAssetDto>>>
{
    private readonly IFixedAssetRepository _assetRepo;

    public GetFixedAssetsQueryHandler(IFixedAssetRepository assetRepo)
    {
        _assetRepo = assetRepo;
    }

    public async Task<Result<List<FixedAssetDto>>> Handle(GetFixedAssetsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var assets = await _assetRepo.GetAllByCompanyAsync(companyId, request.Status, cancellationToken);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            assets = assets.Where(a =>
                a.AssetCode.ToLower().Contains(term) ||
                a.NameAr.ToLower().Contains(term) ||
                a.NameEn.ToLower().Contains(term) ||
                (a.SerialNumber != null && a.SerialNumber.ToLower().Contains(term)) ||
                (a.Location != null && a.Location.ToLower().Contains(term))
            ).ToList();
        }

        var result = assets.Select(a =>
        {
            var methodAr = a.DepreciationMethod == DepreciationMethod.StraightLine ? "القسط الثابت" : "الرصيد المتناقص";
            var statusAr = a.Status switch
            {
                FixedAssetStatus.Active => "نشط وقيد الاستهلاك",
                FixedAssetStatus.FullyDepreciated => "مستهلك بالكامل",
                FixedAssetStatus.Disposed => "مستبعد / مباع",
                _ => a.Status.ToString()
            };

            var histories = (a.DepreciationHistories ?? new List<AssetDepreciationHistory>())
                .Select(h => new AssetDepreciationHistoryDto(
                    h.Id,
                    h.DepreciationDate,
                    h.PeriodNumber,
                    h.FiscalYear,
                    h.DepreciationAmount,
                    h.BookValueBefore,
                    h.BookValueAfter,
                    h.JournalEntryId,
                    h.JournalEntryNumber,
                    h.CreatedAtUtc,
                    h.CreatedBy))
                .ToList();

            return new FixedAssetDto(
                a.Id,
                a.AssetCode,
                a.NameAr,
                a.NameEn,
                a.AssetAccountId,
                a.AssetAccount?.AccountCode ?? "",
                a.AssetAccount?.NameAr ?? "",
                a.AccumulatedDepreciationAccountId,
                a.AccumulatedDepreciationAccount?.AccountCode ?? "",
                a.AccumulatedDepreciationAccount?.NameAr ?? "",
                a.DepreciationExpenseAccountId,
                a.DepreciationExpenseAccount?.AccountCode ?? "",
                a.DepreciationExpenseAccount?.NameAr ?? "",
                a.CostCenterId,
                a.CostCenter?.NameAr,
                a.PurchaseDate,
                a.DepreciationStartDate,
                a.AcquisitionCost,
                a.SalvageValue,
                a.UsefulLifeMonths,
                a.DepreciationMethod,
                methodAr,
                a.DepreciationRate,
                a.CurrentBookValue,
                a.TotalAccumulatedDepreciation,
                a.LastDepreciationDate,
                a.Status,
                statusAr,
                a.SerialNumber,
                a.Location,
                a.Notes,
                a.CalculateMonthlyDepreciation(),
                histories);
        }).ToList();

        return Result.Success(result);
    }
}
