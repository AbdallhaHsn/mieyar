using System.Text;

namespace AlRobban.Modules.GeneralLedger.Application.Common;

public static class ArabicCurrencyTafqeet
{
    private static readonly string[] Ones = {
        "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
        "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر",
        "سبعة عشر", "ثمانية عشر", "تسعة عشر"
    };

    private static readonly string[] Tens = {
        "", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"
    };

    private static readonly string[] Hundreds = {
        "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"
    };

    public static string Convert(decimal amount, string currencyName = "ريال سعودي", string subCurrencyName = "هللة")
    {
        if (amount == 0)
            return $"فقط صفر {currencyName} لا غير";

        var isNegative = amount < 0;
        amount = Math.Abs(amount);

        long integerPart = (long)Math.Floor(amount);
        int decimalPart = (int)Math.Round((amount - integerPart) * 100);

        var sb = new StringBuilder();
        if (isNegative) sb.Append("سالب ");

        var integerWords = ConvertInteger(integerPart);
        sb.Append($"فقط {integerWords} {currencyName}");

        if (decimalPart > 0)
        {
            var decimalWords = ConvertInteger(decimalPart);
            sb.Append($" و {decimalWords} {subCurrencyName}");
        }

        sb.Append(" لا غير");
        return sb.ToString();
    }

    private static string ConvertInteger(long number)
    {
        if (number == 0) return "صفر";

        var billions = number / 1_000_000_000;
        var millions = (number % 1_000_000_000) / 1_000_000;
        var thousands = (number % 1_000_000) / 1_000;
        var remainder = number % 1_000;

        var parts = new List<string>();

        if (billions > 0)
        {
            if (billions == 1) parts.Add("مليار");
            else if (billions == 2) parts.Add("ملياران");
            else if (billions >= 3 && billions <= 10) parts.Add($"{ConvertThreeDigits((int)billions)} مليارات");
            else parts.Add($"{ConvertThreeDigits((int)billions)} مليار");
        }

        if (millions > 0)
        {
            if (millions == 1) parts.Add("مليون");
            else if (millions == 2) parts.Add("مليونان");
            else if (millions >= 3 && millions <= 10) parts.Add($"{ConvertThreeDigits((int)millions)} ملايين");
            else parts.Add($"{ConvertThreeDigits((int)millions)} مليون");
        }

        if (thousands > 0)
        {
            if (thousands == 1) parts.Add("ألف");
            else if (thousands == 2) parts.Add("ألفان");
            else if (thousands >= 3 && thousands <= 10) parts.Add($"{ConvertThreeDigits((int)thousands)} آلاف");
            else parts.Add($"{ConvertThreeDigits((int)thousands)} ألف");
        }

        if (remainder > 0)
        {
            parts.Add(ConvertThreeDigits((int)remainder));
        }

        return string.Join(" و ", parts);
    }

    private static string ConvertThreeDigits(int n)
    {
        var parts = new List<string>();
        int h = n / 100;
        int t = n % 100;

        if (h > 0)
            parts.Add(Hundreds[h]);

        if (t > 0)
        {
            if (t < 20)
            {
                parts.Add(Ones[t]);
            }
            else
            {
                int ones = t % 10;
                int tens = t / 10;
                if (ones > 0)
                    parts.Add($"{Ones[ones]} و {Tens[tens]}");
                else
                    parts.Add(Tens[tens]);
            }
        }

        return string.Join(" و ", parts);
    }
}
