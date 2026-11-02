namespace AlRobban.Modules.InvoicingAndZatca.Domain.Enums;

public enum PosShiftStatus
{
    Open = 1,   // وردية مفتوحة ونشطة
    Closed = 2  // وردية مغلقة ومجردة
}

public enum PosPaymentMethod
{
    Cash = 1,        // نقدي
    Mada = 2,        // بطاقة مدى / شبكة
    CreditCard = 3,  // بطاقة ائتمانية (Visa / Master)
    Split = 4        // دفع مجزأ (نقدي + مدى)
}

public enum CashMovementType
{
    CashIn = 1,   // إيداع نقدي بالدرج (Paid In)
    CashOut = 2   // سحب نقدي من الدرج (Paid Out)
}
