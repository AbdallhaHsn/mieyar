namespace AlRobban.Modules.HumanResources.Domain.Enums;

public enum EmployeeStatus
{
    Active = 1,
    OnLeave = 2,
    Probation = 3,
    Suspended = 4,
    Resigned = 5,
    Terminated = 6
}

public enum ContractType
{
    Limited = 1,       // عقد محدد المدة
    Unlimited = 2,     // عقد غير محدد المدة
    PartTime = 3,      // دوام جزئي
    Temporary = 4      // عقد موسمي / مؤقت
}

public enum Gender
{
    Male = 1,
    Female = 2
}

public enum PayrollStatus
{
    Draft = 1,         // مسودة أولية
    Calculated = 2,    // تم احتساب الرواتب والبدلات والتأمينات
    Approved = 3,      // تم الاعتماد المالي
    PostedToGl = 4,    // تم ترحيل القيد المحاسبي
    Paid = 5,          // تم الصرف والتحويل البنكي
    Cancelled = 6      // ملغي
}

public enum EndOfServiceReason
{
    ContractEnd = 1,                 // انتهاء مدة العقد (استحقاق كامل 100%)
    CompanyTermination = 2,          // إنهاء العقد من قبل المنشأة (استحقاق كامل 100%)
    ResignationLessThan2Years = 3,   // استقالة خلال أقل من سنتين (لا يستحق 0%)
    Resignation2To5Years = 4,        // استقالة من سنتين إلى 5 سنوات (ثلث المكافأة 33.3%)
    Resignation5To10Years = 5,       // استقالة من 5 إلى 10 سنوات (ثلثي المكافأة 66.7%)
    ResignationMoreThan10Years = 6,  // استقالة بعد أكثر من 10 سنوات (كامل المكافأة 100%)
    ForceMajeure = 7                 // قوة قاهرة / وفاة / عجز (استحقاق كامل 100%)
}
