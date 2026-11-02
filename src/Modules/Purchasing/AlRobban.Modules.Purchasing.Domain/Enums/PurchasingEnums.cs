namespace AlRobban.Modules.Purchasing.Domain.Enums;

public enum ItemType
{
    Stockable = 1,  // بضاعة ومواد مخزنية
    Service = 2,    // خدمات واستشارات غير ملموسة
    Consumable = 3  // مواد استهلاكية فورية
}

public enum PurchaseInvoiceStatus
{
    Draft = 1,      // مسودة
    Approved = 2,   // معتمدة
    Posted = 3,     // مرحلة في دفتر الأستاذ والمخزون
    Cancelled = 4   // ملغاة ومردودة
}

public enum PurchasePaymentStatus
{
    Unpaid = 1,        // غير مدفوعة (آجل)
    PartiallyPaid = 2, // مسددة جزئياً
    Paid = 3           // مدفوعة بالكامل
}

public enum InventoryMovementType
{
    PurchaseIn = 1,          // استلام مشتريات بضاعة (+)
    SaleOut = 2,             // صرف مبيعات بضاعة (-)
    ReturnOut = 3,           // مردودات مشتريات لمورد (-)
    InventoryAdjustment = 4, // تسوية جردية أرباح/عجز مخزون (±)
    ReturnIn = 5,            // مردودات مبيعات من عميل (+)
    TransferOut = 6,         // تحويل مخزني صادر من مستودع (-)
    TransferIn = 7           // تحويل مخزني وارد إلى مستودع (+)
}

public enum RequisitionStatus
{
    Draft = 1,          // مسودة
    Submitted = 2,      // بانتظار الاعتماد
    Approved = 3,       // معتمد من الإدارة
    Rejected = 4,       // مرفوض
    ConvertedToPo = 5,  // تم تحويله لأمر شراء
    Cancelled = 6       // ملغي
}

public enum RequisitionPriority
{
    Low = 1,     // منخفض
    Medium = 2,  // عادي
    High = 3,    // عاجل
    Urgent = 4   // طارئ جداً
}

public enum PurchaseOrderStatus
{
    Draft = 1,              // مسودة
    Confirmed = 2,          // معتمد ومؤكد للمورد
    PartiallyReceived = 3,  // تم استلام جزء من البضاعة
    FullyReceived = 4,      // تم استلام كامل البضاعة
    Billed = 5,             // مفوتر بالكامل
    Cancelled = 6           // ملغي
}

public enum GoodsReceiptStatus
{
    Draft = 1,              // مسودة فحص
    Accepted = 2,           // مقبول ومرحل للمستودع
    PartiallyAccepted = 3,  // مقبول جزئياً مع وجود مرتجع
    Rejected = 4            // مرفوض بالكامل لمخالفة المواصفات
}

public enum ThreeWayMatchingStatus
{
    NotMatched = 0,         // غير مطابق / بانتظار المطابقة
    Matched = 1,            // مطابقة تامة 100% (أمر الشراء = محضر الاستلام = الفاتورة)
    PriceVariance = 2,      // فرق في السعر بين أمر الشراء والفاتورة
    QuantityVariance = 3,   // فرق في الكمية بين محضر الاستلام والفاتورة
    ManualApproval = 4      // اعتماد استثنائي من الإدارة المالية
}

