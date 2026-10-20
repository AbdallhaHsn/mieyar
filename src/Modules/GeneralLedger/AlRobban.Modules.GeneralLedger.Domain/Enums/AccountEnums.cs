namespace AlRobban.Modules.GeneralLedger.Domain.Enums;

public enum AccountType
{
    Asset = 1,       // 1: الأصول
    Liability = 2,   // 2: الالتزامات والخصوم
    Equity = 3,      // 3: حقوق الملكية
    Revenue = 4,     // 4: الإيرادات والمبيعات
    Expense = 5      // 5: المصروفات والتكاليف
}

public enum AccountNature
{
    Debit = 1,   // مدين بطبيعته (الأصول والمصروفات)
    Credit = 2   // دائن بطبيعته (الالتزامات، حقوق الملكية، الإيرادات)
}

public enum FinancialStatement
{
    BalanceSheet = 1,     // قائمة المركز المالي (الميزانية العمومية)
    IncomeStatement = 2   // قائمة الدخل (الأرباح والخسائر)
}
