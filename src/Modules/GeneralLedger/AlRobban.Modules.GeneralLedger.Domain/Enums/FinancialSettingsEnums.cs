namespace AlRobban.Modules.GeneralLedger.Domain.Enums;

public enum CostCenterPolicy
{
    MandatoryForIncomeAndExpense = 1, // إلزامي لحسابات الإيرادات والمصروفات
    Optional = 2,                     // اختياري لجميع الحسابات
    Disabled = 3                      // معطل في المنشأة
}

public enum CalendarType
{
    Gregorian = 1, // ميلادي
    Hijri = 2      // هجري
}

public enum FiscalPeriodStatus
{
    Open = 1,   // مفتوحة
    Locked = 2, // مقفلة مؤقتاً
    Closed = 3  // مغلقة نهائياً
}
