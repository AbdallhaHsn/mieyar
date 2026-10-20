namespace AlRobban.Modules.GeneralLedger.Domain.ValueObjects;

public record SampleJournalEntryLeg(
    string AccountSide,       // "Debit" or "Credit"
    string AccountNameAr,
    string AccountNameEn,
    string ExplanationAr
);

public record SampleJournalEntry(
    string TransactionTitleAr,
    string TransactionTitleEn,
    string ScenarioDescriptionAr,
    List<SampleJournalEntryLeg> Legs
);

public class AccountingStandardGuidance
{
    public string StandardCode { get; set; } = string.Empty;       // e.g. "IAS 16", "IFRS 15", "IAS 2"
    public string StandardTitleAr { get; set; } = string.Empty;     // e.g. "معيار المحاسبة الدولي 16: العقارات والآلات والمعدات"
    public string StandardTitleEn { get; set; } = string.Empty;
    public string RecognitionCriteriaAr { get; set; } = string.Empty; // شروط الاعتراف المحاسبي
    public string DebitRuleAr { get; set; } = string.Empty;          // متى يكون الحساب مديناً
    public string CreditRuleAr { get; set; } = string.Empty;         // متى يكون الحساب دائناً
    public string ZatcaTaxImpactAr { get; set; } = string.Empty;     // المعالجة الزكوية والضريبية (ZATCA)
    public List<SampleJournalEntry> TypicalJournalEntries { get; set; } = new();

    public AccountingStandardGuidance() { }

    public static AccountingStandardGuidance Create(
        string standardCode,
        string standardTitleAr,
        string standardTitleEn,
        string recognitionCriteriaAr,
        string debitRuleAr,
        string creditRuleAr,
        string zatcaTaxImpactAr,
        List<SampleJournalEntry>? typicalJournalEntries = null)
    {
        return new AccountingStandardGuidance
        {
            StandardCode = standardCode,
            StandardTitleAr = standardTitleAr,
            StandardTitleEn = standardTitleEn,
            RecognitionCriteriaAr = recognitionCriteriaAr,
            DebitRuleAr = debitRuleAr,
            CreditRuleAr = creditRuleAr,
            ZatcaTaxImpactAr = zatcaTaxImpactAr,
            TypicalJournalEntries = typicalJournalEntries ?? new()
        };
    }
}
