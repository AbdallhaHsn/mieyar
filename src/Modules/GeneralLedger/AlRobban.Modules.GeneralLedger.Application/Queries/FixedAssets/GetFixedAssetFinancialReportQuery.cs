using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FixedAssets;

public record GetFixedAssetFinancialReportQuery(
    Guid? CompanyId = null,
    DateTime? AsOfDate = null,
    int? FiscalYear = null) : IRequest<Result<FixedAssetFinancialReportDto>>;

public class GetFixedAssetFinancialReportQueryHandler : IRequestHandler<GetFixedAssetFinancialReportQuery, Result<FixedAssetFinancialReportDto>>
{
    private readonly IFixedAssetRepository _assetRepo;

    public GetFixedAssetFinancialReportQueryHandler(IFixedAssetRepository assetRepo)
    {
        _assetRepo = assetRepo;
    }

    public async Task<Result<FixedAssetFinancialReportDto>> Handle(
        GetFixedAssetFinancialReportQuery request,
        CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var asOf = request.AsOfDate?.Date ?? DateTime.UtcNow.Date;
        var year = request.FiscalYear ?? asOf.Year;
        var yearStart = new DateTime(year, 1, 1);

        var allAssets = await _assetRepo.GetAllByCompanyAsync(companyId, null, cancellationToken);

        // 1. Map individual asset DTOs
        var assetDtos = allAssets.Select(a =>
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

        // 2. Category Summary (Grouped by Asset Account)
        var categoryGroups = assetDtos
            .GroupBy(a => a.AssetAccountId)
            .Select(g =>
            {
                var first = g.First();
                var cost = g.Sum(x => x.AcquisitionCost);
                var salvage = g.Sum(x => x.SalvageValue);
                var accum = g.Sum(x => x.TotalAccumulatedDepreciation);
                var netBook = g.Sum(x => x.CurrentBookValue);
                var ratio = cost > 0 ? Math.Round((accum / cost) * 100m, 2) : 0m;

                return new FixedAssetCategorySummaryDto(
                    first.AssetAccountId,
                    first.AssetAccountCode,
                    string.IsNullOrWhiteSpace(first.AssetAccountNameAr) ? "أصول عامة" : first.AssetAccountNameAr,
                    g.Count(),
                    cost,
                    salvage,
                    accum,
                    netBook,
                    ratio,
                    g.ToList());
            })
            .OrderBy(c => c.AccountCode)
            .ToList();

        // 3. Movement Schedule (Schedule of Fixed Assets & Depreciation Movements)
        var movementSchedule = categoryGroups.Select(cat =>
        {
            var catAssets = allAssets.Where(a => a.AssetAccountId == cat.AssetAccountId).ToList();

            // Opening: Assets purchased before this year
            var openingAssets = catAssets.Where(a => a.PurchaseDate < yearStart).ToList();
            var openingCost = openingAssets.Sum(a => a.AcquisitionCost);

            // Additions: Assets purchased during this year
            var additions = catAssets.Where(a => a.PurchaseDate >= yearStart && a.PurchaseDate <= asOf).ToList();
            var additionsCost = additions.Sum(a => a.AcquisitionCost);

            // Disposals
            var disposedInPeriod = catAssets.Where(a => a.Status == FixedAssetStatus.Disposed).ToList();
            var disposalsCost = disposedInPeriod.Sum(a => a.AcquisitionCost);
            var disposalsAccumulated = disposedInPeriod.Sum(a => a.TotalAccumulatedDepreciation);

            var closingCost = cat.TotalCost;

            // Accumulated movements
            var allPeriodHistories = catAssets
                .SelectMany(a => a.DepreciationHistories ?? new List<AssetDepreciationHistory>())
                .Where(h => h.FiscalYear == year || (h.DepreciationDate >= yearStart && h.DepreciationDate <= asOf))
                .ToList();

            var periodDepreciation = allPeriodHistories.Sum(h => h.DepreciationAmount);
            var closingAccumulated = cat.TotalAccumulated;
            var openingAccumulated = Math.Max(0, closingAccumulated - periodDepreciation + disposalsAccumulated);

            var openingBook = Math.Max(0, openingCost - openingAccumulated);
            var closingBook = cat.NetBookValue;

            return new FixedAssetMovementCategoryDto(
                cat.AccountNameAr,
                cat.AccountCode,
                openingCost,
                additionsCost,
                disposalsCost,
                closingCost,
                openingAccumulated,
                periodDepreciation,
                disposalsAccumulated,
                closingAccumulated,
                openingBook,
                closingBook);
        }).ToList();

        // 4. Disposals & Capital Gains / Losses
        var disposalsList = new List<FixedAssetDisposalReportItemDto>();
        decimal totalGains = 0;
        decimal totalLosses = 0;

        foreach (var d in allAssets.Where(a => a.Status == FixedAssetStatus.Disposed))
        {
            decimal salePrice = 0;
            string? reason = d.Notes;
            string? jNumber = null;

            if (!string.IsNullOrWhiteSpace(d.Notes) && d.Notes.Contains("سعر البيع:"))
            {
                var parts = d.Notes.Split(new[] { "سعر البيع:" }, StringSplitOptions.None);
                if (parts.Length > 1)
                {
                    var priceStr = parts[1].Trim().TrimEnd(')');
                    decimal.TryParse(priceStr, out salePrice);
                }
            }

            var bookValAtDisposal = d.CurrentBookValue;
            var diff = salePrice - bookValAtDisposal;
            var isGain = diff >= 0;
            var gainOrLoss = Math.Abs(diff);

            if (isGain) totalGains += gainOrLoss;
            else totalLosses += gainOrLoss;

            disposalsList.Add(new FixedAssetDisposalReportItemDto(
                d.Id,
                d.AssetCode,
                d.NameAr,
                d.NameEn,
                d.LastModifiedAtUtc?.Date ?? d.PurchaseDate,
                reason,
                d.AcquisitionCost,
                d.TotalAccumulatedDepreciation,
                bookValAtDisposal,
                salePrice,
                gainOrLoss,
                isGain,
                jNumber));
        }

        // 5. Overall Totals
        var totalPeriodDepr = movementSchedule.Sum(m => m.PeriodDepreciation);
        var totals = new FixedAssetReportTotalsDto(
            TotalAssetsCount: allAssets.Count,
            ActiveCount: allAssets.Count(a => a.Status == FixedAssetStatus.Active),
            FullyDepreciatedCount: allAssets.Count(a => a.Status == FixedAssetStatus.FullyDepreciated),
            DisposedCount: allAssets.Count(a => a.Status == FixedAssetStatus.Disposed),
            TotalAcquisitionCost: allAssets.Sum(a => a.AcquisitionCost),
            TotalSalvageValue: allAssets.Sum(a => a.SalvageValue),
            TotalAccumulatedDepreciation: allAssets.Sum(a => a.TotalAccumulatedDepreciation),
            TotalNetBookValue: allAssets.Sum(a => a.CurrentBookValue),
            TotalPeriodDepreciation: totalPeriodDepr,
            TotalGainsOnDisposals: totalGains,
            TotalLossesOnDisposals: totalLosses);

        var report = new FixedAssetFinancialReportDto(
            CompanyId: companyId,
            AsOfDate: asOf,
            FiscalYear: year,
            Totals: totals,
            Categories: categoryGroups,
            MovementSchedule: movementSchedule,
            Disposals: disposalsList);

        return Result.Success(report);
    }
}
