using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FixedAssets;

public record DisposeFixedAssetCommand(Guid AssetId, DisposeFixedAssetRequest Request) : IRequest<Result<DisposeFixedAssetResultDto>>;

public class DisposeFixedAssetCommandHandler : IRequestHandler<DisposeFixedAssetCommand, Result<DisposeFixedAssetResultDto>>
{
    private readonly IFixedAssetRepository _assetRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public DisposeFixedAssetCommandHandler(
        IFixedAssetRepository assetRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _assetRepo = assetRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<DisposeFixedAssetResultDto>> Handle(DisposeFixedAssetCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var asset = await _assetRepo.GetByIdAsync(command.AssetId, cancellationToken);
        if (asset == null)
        {
            return Result.Failure<DisposeFixedAssetResultDto>(new Error("FixedAsset.NotFound", "الأصل الثابت المطلوب غير موجود"));
        }

        if (asset.Status == FixedAssetStatus.Disposed)
        {
            return Result.Failure<DisposeFixedAssetResultDto>(new Error("FixedAsset.AlreadyDisposed", "هذا الأصل تم استبعاده أو بيعه مسبقاً"));
        }

        var companyId = req.CompanyId ?? asset.CompanyId;
        var disposalDate = req.DisposalDate.Date;
        var salePrice = Math.Max(0, req.SalePrice);

        var acquisitionCost = asset.AcquisitionCost;
        var accumulatedDep = asset.TotalAccumulatedDepreciation;
        var bookValue = asset.CurrentBookValue;

        // Gain or loss calculation: SalePrice - NetBookValue
        var netDifference = salePrice - bookValue;
        var isGain = netDifference >= 0;
        var diffAbsolute = Math.Abs(netDifference);

        var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

        // Find or validate Proceeds Account if sale price > 0
        Guid proceedsAccId = req.ProceedsAccountId ?? Guid.Empty;
        if (salePrice > 0 && proceedsAccId == Guid.Empty)
        {
            var defaultCashBank = accounts.FirstOrDefault(a => (a.AccountCode == "11101" || a.AccountCode == "11102" || a.AccountCode.StartsWith("111")) && a.IsPostable);
            if (defaultCashBank == null)
            {
                return Result.Failure<DisposeFixedAssetResultDto>(new Error("FixedAsset.NoProceedsAccount", "يرجى تحديد حساب استلام القيمة البيعية (صندوق/بنك)"));
            }
            proceedsAccId = defaultCashBank.Id;
        }

        // Find or validate Gain / Loss account
        Guid gainLossAccId = req.GainLossAccountId ?? Guid.Empty;
        if (diffAbsolute > 0 && gainLossAccId == Guid.Empty)
        {
            if (isGain)
            {
                // Other Revenue / Gain on disposal
                var gainAcc = accounts.FirstOrDefault(a => (a.AccountCode.StartsWith("42") || a.NameAr.Contains("أرباح بيع") || a.NameAr.Contains("إيرادات أخرى")) && a.IsPostable)
                              ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Revenue && a.IsPostable);
                if (gainAcc == null)
                {
                    return Result.Failure<DisposeFixedAssetResultDto>(new Error("FixedAsset.NoGainAccount", "لم يتم العثور على حساب أرباح استبعاد أصول ثابتة (إيرادات أخرى)"));
                }
                gainLossAccId = gainAcc.Id;
            }
            else
            {
                // Other Expense / Loss on disposal
                var lossAcc = accounts.FirstOrDefault(a => (a.AccountCode.StartsWith("53") || a.NameAr.Contains("خسائر بيع") || a.NameAr.Contains("خسائر استبعاد") || a.NameAr.Contains("مصروفات أخرى")) && a.IsPostable)
                              ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Expense && a.IsPostable);
                if (lossAcc == null)
                {
                    return Result.Failure<DisposeFixedAssetResultDto>(new Error("FixedAsset.NoLossAccount", "لم يتم العثور على حساب خسائر استبعاد أصول ثابتة (مصروفات أخرى)"));
                }
                gainLossAccId = lossAcc.Id;
            }
        }

        // Prepare Balanced Journal Entry Lines
        var lines = new List<CreateJournalEntryLineRequest>();

        // 1. Debit Proceeds (Cash / Bank) if sold
        if (salePrice > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                proceedsAccId,
                Debit: salePrice,
                Credit: 0,
                Description: $"قيمة بيع الأصل الثابت [{asset.AssetCode}] {asset.NameAr}",
                CostCenterId: asset.CostCenterId));
        }

        // 2. Debit Accumulated Depreciation (to close it completely)
        if (accumulatedDep > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                asset.AccumulatedDepreciationAccountId,
                Debit: accumulatedDep,
                Credit: 0,
                Description: $"إقفال مجمع إهلاك الأصل المستبعد [{asset.AssetCode}]",
                CostCenterId: asset.CostCenterId));
        }

        // 3. Debit Loss OR Credit Gain
        if (diffAbsolute > 0)
        {
            if (isGain)
            {
                lines.Add(new CreateJournalEntryLineRequest(
                    gainLossAccId,
                    Debit: 0,
                    Credit: diffAbsolute,
                    Description: $"أرباح رأسمالية من بيع الأصل [{asset.AssetCode}] {asset.NameAr}",
                    CostCenterId: asset.CostCenterId));
            }
            else
            {
                lines.Add(new CreateJournalEntryLineRequest(
                    gainLossAccId,
                    Debit: diffAbsolute,
                    Credit: 0,
                    Description: $"خسائر رأسمالية ناتجة عن استبعاد الأصل [{asset.AssetCode}] {asset.NameAr}",
                    CostCenterId: asset.CostCenterId));
            }
        }

        // 4. Credit Asset Original Account (to remove the asset from books)
        lines.Add(new CreateJournalEntryLineRequest(
            asset.AssetAccountId,
            Debit: 0,
            Credit: acquisitionCost,
            Description: $"إلغاء واستبعاد التكلفة التاريخية للأصل [{asset.AssetCode}] {asset.NameAr}",
            CostCenterId: asset.CostCenterId));

        // Create & Post the Disposal Journal Entry
        var actionLabel = salePrice > 0 ? "بيع" : "استبعاد وتخريد";
        var journalCommand = new CreateJournalEntryCommand(
            companyId,
            disposalDate,
            JournalEntryType.Daily,
            DescriptionAr: $"قيد {actionLabel} الأصل الثابت [{asset.AssetCode}] {asset.NameAr} - السبب: {req.Reason}",
            DescriptionEn: $"Fixed Asset Disposal/Sale Entry for [{asset.AssetCode}]",
            ReferenceNumber: $"DISP-{asset.AssetCode}",
            PostImmediately: true,
            Lines: lines);

        var entryResult = await _mediator.Send(journalCommand, cancellationToken);
        if (entryResult.IsFailure)
        {
            return Result.Failure<DisposeFixedAssetResultDto>(entryResult.Error);
        }

        // Update Asset domain entity
        asset.DisposeWithSale(req.Reason, disposalDate, salePrice, "User");
        await _assetRepo.SaveChangesAsync(cancellationToken);

        var message = salePrice > 0
            ? $"تم بيع الأصل بنجاح بمبلغ {salePrice:N2} ريال، وصافي {(isGain ? "أرباح" : "خسائر")} بمبلغ {diffAbsolute:N2} ريال، وتم ترحيل القيد رقم [{entryResult.Value.EntryNumber}]."
            : $"تم استبعاد وشطب الأصل بنجاح، وترحيل قيد الاستبعاد رقم [{entryResult.Value.EntryNumber}].";

        return Result.Success(new DisposeFixedAssetResultDto(
            asset.Id,
            asset.AssetCode,
            asset.NameAr,
            acquisitionCost,
            accumulatedDep,
            bookValue,
            salePrice,
            diffAbsolute,
            isGain,
            entryResult.Value.Id,
            entryResult.Value.EntryNumber,
            message));
    }
}
