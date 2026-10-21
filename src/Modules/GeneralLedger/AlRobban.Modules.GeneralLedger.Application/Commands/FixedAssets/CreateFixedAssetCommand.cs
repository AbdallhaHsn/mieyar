using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FixedAssets;

public record CreateFixedAssetCommand(CreateFixedAssetRequest Request) : IRequest<Result<FixedAssetDto>>;

public class CreateFixedAssetCommandHandler : IRequestHandler<CreateFixedAssetCommand, Result<FixedAssetDto>>
{
    private readonly IFixedAssetRepository _assetRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateFixedAssetCommandHandler(
        IFixedAssetRepository assetRepo,
        IAccountRepository accountRepo,
        ICurrentTenantContext tenantContext)
    {
        _assetRepo = assetRepo;
        _accountRepo = accountRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<FixedAssetDto>> Handle(CreateFixedAssetCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = req.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        // Validate Asset Account
        var assetAccount = await _accountRepo.GetByIdAsync(req.AssetAccountId, cancellationToken);
        if (assetAccount == null || !assetAccount.IsPostable)
            return Result.Failure<FixedAssetDto>(new Error("FixedAsset.InvalidAssetAccount", "حساب الأصل غير موجود أو غير قابل للقيد المباشر"));

        // Validate Accumulated Depreciation Account
        var accumAccount = await _accountRepo.GetByIdAsync(req.AccumulatedDepreciationAccountId, cancellationToken);
        if (accumAccount == null || !accumAccount.IsPostable)
            return Result.Failure<FixedAssetDto>(new Error("FixedAsset.InvalidAccumAccount", "حساب مجمع الإهلاك غير موجود أو غير قابل للقيد المباشر"));

        // Validate Depreciation Expense Account
        var expenseAccount = await _accountRepo.GetByIdAsync(req.DepreciationExpenseAccountId, cancellationToken);
        if (expenseAccount == null || !expenseAccount.IsPostable)
            return Result.Failure<FixedAssetDto>(new Error("FixedAsset.InvalidExpenseAccount", "حساب مصروف الإهلاك غير موجود أو غير قابل للقيد المباشر"));

        var purchaseYear = req.PurchaseDate.Year;
        var count = await _assetRepo.GetCountForYearAsync(companyId, purchaseYear, cancellationToken);
        var assetCode = $"AST-{purchaseYear}-{(count + 1):D5}";

        var depStartDate = req.DepreciationStartDate ?? req.PurchaseDate;

        var asset = FixedAsset.Create(
            tenantId,
            companyId,
            assetCode,
            req.NameAr,
            req.NameEn ?? req.NameAr,
            req.AssetAccountId,
            req.AccumulatedDepreciationAccountId,
            req.DepreciationExpenseAccountId,
            req.CostCenterId,
            req.PurchaseDate,
            depStartDate,
            req.AcquisitionCost,
            req.SalvageValue,
            req.UsefulLifeMonths,
            req.DepreciationMethod,
            req.DepreciationRate,
            req.SerialNumber,
            req.Location,
            req.Notes,
            "Admin / Accountant");

        await _assetRepo.AddAsync(asset, cancellationToken);
        await _assetRepo.SaveChangesAsync(cancellationToken);

        var methodAr = asset.DepreciationMethod == DepreciationMethod.StraightLine ? "القسط الثابت" : "الرصيد المتناقص";

        return Result.Success(new FixedAssetDto(
            asset.Id,
            asset.AssetCode,
            asset.NameAr,
            asset.NameEn,
            asset.AssetAccountId,
            assetAccount.AccountCode,
            assetAccount.NameAr,
            asset.AccumulatedDepreciationAccountId,
            accumAccount.AccountCode,
            accumAccount.NameAr,
            asset.DepreciationExpenseAccountId,
            expenseAccount.AccountCode,
            expenseAccount.NameAr,
            asset.CostCenterId,
            null,
            asset.PurchaseDate,
            asset.DepreciationStartDate,
            asset.AcquisitionCost,
            asset.SalvageValue,
            asset.UsefulLifeMonths,
            asset.DepreciationMethod,
            methodAr,
            asset.DepreciationRate,
            asset.CurrentBookValue,
            asset.TotalAccumulatedDepreciation,
            asset.LastDepreciationDate,
            asset.Status,
            "نشط وقيد الاستهلاك",
            asset.SerialNumber,
            asset.Location,
            asset.Notes,
            asset.CalculateMonthlyDepreciation(),
            new List<AssetDepreciationHistoryDto>()));
    }
}
