namespace AlRobban.Modules.InvoicingAndZatca.Domain.Enums;

public enum InvoiceType
{
    Standard = 1,   // فاتورة ضريبية B2B
    Simplified = 2  // فاتورة ضريبية مبسطة B2C
}

public enum TransactionType
{
    Invoice = 1,    // فاتورة بيع
    CreditNote = 2, // إشعار دائن (مرتجع مبيعات)
    DebitNote = 3,  // إشعار مدين (تسوية بالإضافة)
    Quotation = 4   // عرض أسعار
}

public enum InvoiceStatus
{
    Draft = 1,      // مسودة
    Issued = 2,     // معتمدة ومصدرة
    Cleared = 3,    // مقبولة معتمدة من هيئة زكاة (B2B Clearance)
    Reported = 4,   // مبلّغة ومسجلة لدى هيئة زكاة (B2C Reporting)
    Rejected = 5,   // مرفوضة
    Cancelled = 6   // ملغاة بإشعار دائن
}

public enum InvoicePaymentStatus
{
    Unpaid = 1,        // غير محصلة (آجل)
    PartiallyPaid = 2, // محصلة جزئياً
    Paid = 3           // محصلة بالكامل
}
