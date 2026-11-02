namespace AlRobban.Modules.GeneralLedger.Domain.Enums;

public enum JournalEntryType
{
    Daily = 1,       // قيد يومية عامة تشغيلي
    Opening = 2,     // قيد افتتاحي
    Adjustment = 3,  // قيد تسوية جردية
    Closing = 4,     // قيد إقفال ختامي
    Payroll = 5      // قيد مسيّر الرواتب والأجور
}

public enum JournalEntryStatus
{
    Draft = 1,    // مسودة - متاح التعديل والحذف
    Posted = 2,   // مرحّل - لا يُعدل ولا يُحذف إطلاقاً ويؤثر على أرصدة شجرة الحسابات
    Reversed = 3  // معكوس - تم إلغاؤه بقيد عكسي معتمد
}
