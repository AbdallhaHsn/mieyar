namespace AlRobban.Modules.IdentityAndAccess.Domain.Enums;

public enum UserRole
{
    SuperAdmin = 1,     // مدير المنصة (الشركة المالكة) - يمتلك كامل الصلاحيات لإضافة وإدارة الشركات
    CompanyAdmin = 2,   // مدير الشركة المستأجرة - يدير فروعها ومستخدميها
    Accountant = 3,     // محاسب - إدخال القيود والفواتير
    FinancialAuditor = 4 // مراجع مالي - اعتماد وترحيل القيود والتقارير
}
