using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public enum DepreciationMethod
{
    StraightLine = 1,     // القسط الثابت
    DecliningBalance = 2  // الرصيد المتناقص
}

public enum FixedAssetStatus
{
    Active = 1,           // نشط وقيد الاستهلاك
    FullyDepreciated = 2, // مستهلك دفترياً بالكامل
    Disposed = 3          // مستبعد / مباع / مشطوب
}

public class FixedAsset : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string AssetCode { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;

    public Guid AssetAccountId { get; private set; }
    public Account? AssetAccount { get; private set; }

    public Guid AccumulatedDepreciationAccountId { get; private set; }
    public Account? AccumulatedDepreciationAccount { get; private set; }

    public Guid DepreciationExpenseAccountId { get; private set; }
    public Account? DepreciationExpenseAccount { get; private set; }

    public Guid? CostCenterId { get; private set; }
    public CostCenter? CostCenter { get; private set; }

    public DateTime PurchaseDate { get; private set; }
    public DateTime DepreciationStartDate { get; private set; }
    public decimal AcquisitionCost { get; private set; }
    public decimal SalvageValue { get; private set; }
    public int UsefulLifeMonths { get; private set; }
    public DepreciationMethod DepreciationMethod { get; private set; } = DepreciationMethod.StraightLine;
    public decimal DepreciationRate { get; private set; }
    public decimal CurrentBookValue { get; private set; }
    public decimal TotalAccumulatedDepreciation { get; private set; }
    public DateTime? LastDepreciationDate { get; private set; }
    public FixedAssetStatus Status { get; private set; } = FixedAssetStatus.Active;

    public string? SerialNumber { get; private set; }
    public string? Location { get; private set; }
    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public List<AssetDepreciationHistory> DepreciationHistories { get; private set; } = new();

    private FixedAsset() { }

    public static FixedAsset Create(
        Guid tenantId,
        Guid companyId,
        string assetCode,
        string nameAr,
        string nameEn,
        Guid assetAccountId,
        Guid accumulatedDepreciationAccountId,
        Guid depreciationExpenseAccountId,
        Guid? costCenterId,
        DateTime purchaseDate,
        DateTime depreciationStartDate,
        decimal acquisitionCost,
        decimal salvageValue,
        int usefulLifeMonths,
        DepreciationMethod method,
        decimal depreciationRate,
        string? serialNumber,
        string? location,
        string? notes,
        string createdBy)
    {
        if (acquisitionCost <= 0)
            throw new ArgumentException("تكلفة اقتناء الأصل يجب أن تكون أكبر من الصفر", nameof(acquisitionCost));

        if (usefulLifeMonths <= 0)
            throw new ArgumentException("العمر الإنتاجي بالشهور يجب أن يكون أكبر من الصفر", nameof(usefulLifeMonths));

        var asset = new FixedAsset
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            AssetCode = assetCode,
            NameAr = nameAr,
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn,
            AssetAccountId = assetAccountId,
            AccumulatedDepreciationAccountId = accumulatedDepreciationAccountId,
            DepreciationExpenseAccountId = depreciationExpenseAccountId,
            CostCenterId = costCenterId,
            PurchaseDate = purchaseDate.Date,
            DepreciationStartDate = depreciationStartDate.Date,
            AcquisitionCost = acquisitionCost,
            SalvageValue = salvageValue,
            UsefulLifeMonths = usefulLifeMonths,
            DepreciationMethod = method,
            DepreciationRate = depreciationRate,
            CurrentBookValue = acquisitionCost,
            TotalAccumulatedDepreciation = 0,
            Status = FixedAssetStatus.Active,
            SerialNumber = serialNumber,
            Location = location,
            Notes = notes,
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };

        return asset;
    }

    /// <summary>
    /// حساب قيمة الإهلاك الشهري المستحق
    /// </summary>
    public decimal CalculateMonthlyDepreciation()
    {
        if (Status != FixedAssetStatus.Active)
            return 0;

        var depreciableBase = AcquisitionCost - SalvageValue;
        if (depreciableBase <= 0)
            return 0;

        var remainingToDepreciate = depreciableBase - TotalAccumulatedDepreciation;
        if (remainingToDepreciate <= 0)
            return 0;

        decimal monthlyAmount;

        if (DepreciationMethod == DepreciationMethod.StraightLine)
        {
            monthlyAmount = Math.Round(depreciableBase / UsefulLifeMonths, 4);
        }
        else // DecliningBalance
        {
            var annualRate = DepreciationRate > 0 ? (DepreciationRate / 100m) : (2m / (UsefulLifeMonths / 12m));
            var monthlyRate = annualRate / 12m;
            monthlyAmount = Math.Round(CurrentBookValue * monthlyRate, 4);
        }

        // Do not exceed remaining depreciable amount
        if (monthlyAmount > remainingToDepreciate)
        {
            monthlyAmount = remainingToDepreciate;
        }

        return monthlyAmount;
    }

    /// <summary>
    /// تسجيل عملية إهلاك شهري وتحديث الرصيد الدفتري
    /// </summary>
    public AssetDepreciationHistory ApplyDepreciation(
        DateTime depDate,
        int periodNumber,
        int fiscalYear,
        decimal amount,
        Guid? journalEntryId,
        string? journalEntryNumber,
        string user)
    {
        if (amount <= 0)
            throw new InvalidOperationException("قيمة الإهلاك يجب أن تكون موجبة");

        var bookBefore = CurrentBookValue;
        TotalAccumulatedDepreciation += amount;
        CurrentBookValue = Math.Max(SalvageValue, AcquisitionCost - TotalAccumulatedDepreciation);
        LastDepreciationDate = depDate.Date;

        if (TotalAccumulatedDepreciation >= (AcquisitionCost - SalvageValue))
        {
            Status = FixedAssetStatus.FullyDepreciated;
        }

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;

        var history = new AssetDepreciationHistory
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            FixedAssetId = Id,
            DepreciationDate = depDate.Date,
            PeriodNumber = periodNumber,
            FiscalYear = fiscalYear,
            DepreciationAmount = amount,
            BookValueBefore = bookBefore,
            BookValueAfter = CurrentBookValue,
            JournalEntryId = journalEntryId,
            JournalEntryNumber = journalEntryNumber,
            CreatedBy = user,
            CreatedAtUtc = DateTime.UtcNow
        };

        return history;
    }

    /// <summary>
    /// استبعاد أو بيع الأصل مع توثيق القيمة البيعية وتاريخ الاستبعاد
    /// </summary>
    public void DisposeWithSale(string reason, DateTime disposalDate, decimal salePrice, string user)
    {
        if (Status == FixedAssetStatus.Disposed)
            throw new InvalidOperationException("الأصل تم استبعاده مسبقاً");

        Status = FixedAssetStatus.Disposed;
        Notes = (string.IsNullOrWhiteSpace(Notes) ? "" : Notes + " | ") +
                $"تم الاستبعاد/البيع بتاريخ {disposalDate:yyyy-MM-dd}: {reason} (سعر البيع: {salePrice:N2})";
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }

    /// <summary>
    /// استبعاد الأصل (تخريد أو شطب)
    /// </summary>
    public void Dispose(string reason, string user)
    {
        DisposeWithSale(reason, DateTime.UtcNow, 0, user);
    }
}

public class AssetDepreciationHistory : IMustHaveTenant
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid FixedAssetId { get; set; }
    public FixedAsset? FixedAsset { get; set; }

    public DateTime DepreciationDate { get; set; }
    public int PeriodNumber { get; set; }
    public int FiscalYear { get; set; }
    public decimal DepreciationAmount { get; set; }
    public decimal BookValueBefore { get; set; }
    public decimal BookValueAfter { get; set; }

    public Guid? JournalEntryId { get; set; }
    public string? JournalEntryNumber { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
}
