namespace AlRobban.Modules.Projects.Domain.Enums;

public enum ProjectStatus
{
    Planning = 0,       // قيد التخطيط والدراسة
    Active = 1,         // قيد التنفيذ
    OnHold = 2,         // متوقف مؤقتاً
    Completed = 3,      // مكتمل ومسلّم
    Cancelled = 4       // ملغى
}

public enum BillingStatus
{
    Draft = 0,               // مسودة
    Submitted = 1,           // مرفوع للاستشاري
    ConsultantApproved = 2,  // معتمد من الاستشاري
    Certified = 3,           // معتمد للصرف والفوترة
    Invoiced = 4,            // تم إصدار فاتورة ضريبية ZATCA
    Rejected = 5             // مرفوض
}

public enum GuaranteeType
{
    BidBond = 0,             // ضمان ابتدائي / دخول مناقصة
    PerformanceBond = 1,     // ضمان نهائي / حسن تنفيذ
    AdvancePaymentBond = 2,  // ضمان دفعة مقدمة
    RetentionBond = 3,       // ضمان محجوز ضمان أعمال
    MaintenanceBond = 4      // ضمان صيانة وتشغيل
}

public enum GuaranteeStatus
{
    Active = 0,    // ساري
    Extended = 1,  // ممدد
    Released = 2,  // مفرج عنه ومسترد
    Claimed = 3,   // مصادر ومطالب به
    Expired = 4    // منتهي الصلاحية
}

public enum ProjectExpenseCategory
{
    Materials = 0,       // مواد وخامات
    Labor = 1,           // أجور وعمالة
    Subcontractors = 2,  // مقاولي باطن
    Equipment = 3,       // معدات وآليات
    Overhead = 4,        // مصاريف عمومية وإشراف
    Other = 5            // أخرى
}
