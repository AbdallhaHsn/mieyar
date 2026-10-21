using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class FinancialStatementSettings : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    /// <summary>
    /// طريقة عرض قائمة الدخل: "multi-step" (متعدد المراحل - IFRS/SOCPA) أو "single-step" (مرحلة واحدة)
    /// </summary>
    public string IncomeStatementFormat { get; set; } = "multi-step";

    /// <summary>
    /// إخفاء الحسابات التي رصيدها وحركتها صفر افتراضياً
    /// </summary>
    public bool DefaultHideZeroBalances { get; set; } = true;

    /// <summary>
    /// مستوى التفصيل الشجري الافتراضي: 1 (رئيسي فقط)، 2 (مجموعات ثانوية)، null (كافة المستويات التحليلية)
    /// </summary>
    public int? DefaultLevelDepth { get; set; } = null;

    /// <summary>
    /// كود حساب الأرباح المبقاة والمحتجزة لسنوات سابقة
    /// </summary>
    public string RetainedEarningsAccountCode { get; set; } = "32102";

    /// <summary>
    /// تفعيل مقارنة الفترات (مقارنة العام الحالي بالعام السابق)
    /// </summary>
    public bool ShowComparativePeriod { get; set; } = false;

    /// <summary>
    /// إظهار مربعات التواقيع والاعتمادات الرسمية (المحاسب، المراجع، المدير المالي)
    /// </summary>
    public bool ShowSignaturesBlock { get; set; } = true;

    /// <summary>
    /// عدد الخانات العشرية: 2 (هللات) أو 0 (تقريب لأقرب ريال)
    /// </summary>
    public int DecimalPlaces { get; set; } = 2;

    /// <summary>
    /// الأساس المحاسبي المعتمد: "accrual" (أساس الاستحقاق) أو "cash" (الأساس النقدي)
    /// </summary>
    public string AccountingBasis { get; set; } = "accrual";

    /// <summary>
    /// تضمين القيود المسودة (Draft) في التحليل الاستشرافي والمحاكاة
    /// </summary>
    public bool AllowDraftSimulation { get; set; } = false;

    /// <summary>
    /// طريقة احتساب قائمة التدفقات النقدية: "indirect" (الطريقة غير المباشرة وفق IAS 7) أو "direct" (الطريقة المباشرة)
    /// </summary>
    public string CashFlowMethod { get; set; } = "indirect";

    /// <summary>
    /// بادئة حسابات النقدية وما في حكمها في شجرة الحسابات (افتراضياً 111)
    /// </summary>
    public string CashAccountPrefix { get; set; } = "111";

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public static FinancialStatementSettings CreateDefault(Guid tenantId, Guid companyId)
    {
        return new FinancialStatementSettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            IncomeStatementFormat = "multi-step",
            DefaultHideZeroBalances = true,
            DefaultLevelDepth = null,
            RetainedEarningsAccountCode = "32102",
            ShowComparativePeriod = false,
            ShowSignaturesBlock = true,
            DecimalPlaces = 2,
            AccountingBasis = "accrual",
            AllowDraftSimulation = false,
            CashFlowMethod = "indirect",
            CashAccountPrefix = "111",
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
