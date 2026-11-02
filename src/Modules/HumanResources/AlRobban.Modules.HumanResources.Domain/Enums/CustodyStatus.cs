namespace AlRobban.Modules.HumanResources.Domain.Enums;

public enum CustodyStatus
{
    Active = 1,        // مسلّمة وفي عهدة الموظف
    PendingReturn = 2, // بانتظار الفحص والاسترجاع
    Returned = 3,      // تم الاسترجاع بحالة سليمة
    Damaged = 4,       // تم الاسترجاع تالفة
    Lost = 5           // مفقودة
}
