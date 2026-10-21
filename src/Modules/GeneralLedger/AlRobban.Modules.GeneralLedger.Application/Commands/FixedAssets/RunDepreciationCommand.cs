using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FixedAssets;

public record RunDepreciationCommand(RunDepreciationRequest Request) : IRequest<Result<RunDepreciationResultDto>>;

public class RunDepreciationCommandHandler : IRequestHandler<RunDepreciationCommand, Result<RunDepreciationResultDto>>
{
    private readonly IFixedAssetRepository _assetRepo;
    private readonly IMediator _mediator;

    public RunDepreciationCommandHandler(
        IFixedAssetRepository assetRepo,
        IMediator mediator)
    {
        _assetRepo = assetRepo;
        _mediator = mediator;
    }

    public async Task<Result<RunDepreciationResultDto>> Handle(RunDepreciationCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var companyId = req.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var depDate = req.DepreciationDate.Date;

        var eligibleAssets = await _assetRepo.GetActiveForDepreciationAsync(companyId, depDate, cancellationToken);
        if (!eligibleAssets.Any())
        {
            return Result.Failure<RunDepreciationResultDto>(new Error("FixedAssets.NoEligibleAssets", "لا توجد أصول نشطة مستحقة للإهلاك في هذا التاريخ"));
        }

        var lines = new List<CreateJournalEntryLineRequest>();
        var assetsToDepreciate = new List<(Domain.Entities.FixedAsset Asset, decimal Amount)>();

        foreach (var asset in eligibleAssets)
        {
            var amount = asset.CalculateMonthlyDepreciation();
            if (amount <= 0) continue;

            assetsToDepreciate.Add((asset, amount));

            // Debit Depreciation Expense
            lines.Add(new CreateJournalEntryLineRequest(
                asset.DepreciationExpenseAccountId,
                Debit: amount,
                Credit: 0,
                Description: $"إهلاك شهري - {asset.AssetCode} ({asset.NameAr})",
                CostCenterId: asset.CostCenterId));

            // Credit Accumulated Depreciation
            lines.Add(new CreateJournalEntryLineRequest(
                asset.AccumulatedDepreciationAccountId,
                Debit: 0,
                Credit: amount,
                Description: $"مجمع إهلاك - {asset.AssetCode} ({asset.NameAr})",
                CostCenterId: asset.CostCenterId));
        }

        if (!assetsToDepreciate.Any())
        {
            return Result.Failure<RunDepreciationResultDto>(new Error("FixedAssets.ZeroDepreciation", "جميع الأصول المحددة مستهلكة بالكامل"));
        }

        var totalAmount = assetsToDepreciate.Sum(x => x.Amount);

        // Create & Post Double-Entry Journal Entry
        var monthYearStr = $"{depDate.Month:D2}/{depDate.Year}";
        var journalCommand = new CreateJournalEntryCommand(
            companyId,
            depDate,
            JournalEntryType.Adjustment,
            DescriptionAr: $"قيد إهلاك الأصول الثابتة الدوري لشهر {monthYearStr} - عدد ({assetsToDepreciate.Count}) أصل",
            DescriptionEn: $"Monthly Fixed Asset Depreciation Entry for {monthYearStr}",
            ReferenceNumber: $"DEP-{depDate.Year}-{depDate.Month:D2}",
            PostImmediately: true,
            Lines: lines);

        var entryResult = await _mediator.Send(journalCommand, cancellationToken);
        if (entryResult.IsFailure)
        {
            return Result.Failure<RunDepreciationResultDto>(entryResult.Error);
        }

        var entryId = entryResult.Value.Id;
        var entryNumber = entryResult.Value.EntryNumber;

        // Apply depreciation to each asset domain entity
        foreach (var (asset, amount) in assetsToDepreciate)
        {
            var trackedAsset = await _assetRepo.GetByIdAsync(asset.Id, cancellationToken);
            if (trackedAsset != null)
            {
                var history = trackedAsset.ApplyDepreciation(
                    depDate,
                    depDate.Month,
                    depDate.Year,
                    amount,
                    entryId,
                    entryNumber,
                    "Admin / Accountant");

                await _assetRepo.AddDepreciationHistoryAsync(history, cancellationToken);
            }
        }

        await _assetRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(new RunDepreciationResultDto(
            entryId,
            entryNumber,
            depDate,
            assetsToDepreciate.Count,
            totalAmount,
            $"تم بنجاح تشغيل الإهلاك لعدد ({assetsToDepreciate.Count}) أصل بإجمالي ({totalAmount:N2} ريال) وتوليد القيد المعتمد [{entryNumber}]."));
    }
}
