namespace AlRobban.Modules.GeneralLedger.Domain.Enums;

public enum VoucherType
{
    Receipt = 1, // سند قبض - تحصيل نقدية/بنك من عميل أو مصدر إيراد
    Payment = 2  // سند صرف - دفع نقدية/بنك لمورد أو مصروف
}

public enum PaymentMethod
{
    Cash = 1,         // نقدي (صندوق/خزينة)
    BankTransfer = 2, // تحويل بنكي / سويفت
    Cheque = 3,       // شيك مصرفي
    Card = 4          // مدى / بطاقة ائتمانية / نقاط بيع
}

public enum VoucherStatus
{
    Draft = 1,     // مسودة - متاح التعديل والحذف
    Posted = 2,    // مرحّل ومعتمد - ولّد قيد يومية رسمي في دفتر الأستاذ
    Cancelled = 3  // ملغي - تم إلغاء السند وعكس القيد المرتبط به
}
