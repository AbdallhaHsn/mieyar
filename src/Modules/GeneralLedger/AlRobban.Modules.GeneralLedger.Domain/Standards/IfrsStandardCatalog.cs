using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;

namespace AlRobban.Modules.GeneralLedger.Domain.Standards;

public static class IfrsStandardCatalog
{
    private static readonly Dictionary<string, AccountingStandardGuidance> Standards = new(StringComparer.OrdinalIgnoreCase);

    static IfrsStandardCatalog()
    {
        // 1. IAS 7: النقدية وما في حكمها
        Register(AccountingStandardGuidance.Create(
            standardCode: "IAS 7",
            standardTitleAr: "معيار المحاسبة الدولي 7: قائمة التدفقات النقدية (النقد وما في حكمه)",
            standardTitleEn: "IAS 7: Statement of Cash Flows (Cash and Cash Equivalents)",
            recognitionCriteriaAr: "يُعترف بالنقدية والأرصدة البنكية كأصول عند توفر السيطرة عليها وتدفق المنافع الاقتصادية للشركة، وتكون جاهزة للتحويل لمبالغ نقدية معلومة دون مخاطر تقلب تذكر.",
            debitRuleAr: "يكون الحساب مديناً عند زيادة السيولة النقدية أو استلام تحويلات بنكية ومتحصلات من المبيعات والعملاء.",
            creditRuleAr: "يكون الحساب دائناً عند السداد النقدي، صرف الشيكات، تسوية التزامات الموردين أو المصروفات التشغيلية.",
            zatcaTaxImpactAr: "لا تخضع حركات النقدية بذاتها لضريبة القيمة المضافة، ولكنها تشكل دليلاً لإثبات سداد الفواتير الضريبية ومطابقة كشوف الحساب البنكية مع منظومة الفوترة الإلكترونية.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "تحصيل مستحقات مبيعات عبر تحويل بنكي",
                    TransactionTitleEn: "Collection of receivables via bank transfer",
                    ScenarioDescriptionAr: "استلام دفعة نقدية بالبنك مقابل فواتير بيع سابقة لعميل تجاري",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "11102 - البنك الجاري", "Bank Current Account", "زيادة رصيد النقدية في البنك (مدين)"),
                        new("Credit", "11201 - العملاء والذمم المدينة", "Accounts Receivable", "تخفيض مستحقات العميل المسدد (دائن)")
                    }
                ),
                new(
                    TransactionTitleAr: "سداد مستحقات مورد بشيك أو تحويل بنكي",
                    TransactionTitleEn: "Payment to vendor via bank transfer",
                    ScenarioDescriptionAr: "سداد فاتورة مشتريات مستحقة للمورد لتصفية حسابه الدائن",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "21101 - الموردون والذمم الدائنة", "Accounts Payable", "تخفيض التزام المورد (مدين)"),
                        new("Credit", "11102 - البنك الجاري", "Bank Current Account", "نقص رصيد الحساب البنكي بالسداد (دائن)")
                    }
                )
            }
        ));

        // 2. IFRS 9 / IFRS 15: الذمم المدينة والعملاء ومخصص خسائر الائتمان ECL
        Register(AccountingStandardGuidance.Create(
            standardCode: "IFRS 9",
            standardTitleAr: "المعيار الدولي للتقرير المالي 9: الأدوات المالية (الذمم المدينة ومخصص ECL)",
            standardTitleEn: "IFRS 9: Financial Instruments (Accounts Receivable & ECL)",
            recognitionCriteriaAr: "يُعترف بالذمم المدينة للعملاء بالقيمة العادلة عند انتقال السيطرة على السلع أو تقديم الخدمات للعميل بموجب عقد وفاتورة ضريبية، مع احتساب مخصص تدني خسائر الائتمان المتوقعة وفق مصفوفة الأعمار.",
            debitRuleAr: "يكون الحساب مديناً عند إصدار فواتير بيع بالأجل للعملاء بقيمة المنتجات والخدمات مضافاً إليها ضريبة القيمة المضافة 15%.",
            creditRuleAr: "يكون الحساب دائناً عند استلام سدادات العملاء أو منح إشعارات دائنة (مرتجعات) أو إعدام الديون المتعثرة بعد استنفاد الإجراءات.",
            zatcaTaxImpactAr: "وفق لوائح ZATCA، استحقاق الضريبة ينشأ بتاريخ إصدار الفاتورة الإلكترونية أو تسليم البضاعة أيهما أسبق، بغض النظر عن تاريخ التحصيل الفعلي من العميل.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "إثبات فاتورة مبيعات بالأجل مع ضريبة القيمة المضافة 15%",
                    TransactionTitleEn: "Credit sales invoice with 15% VAT",
                    ScenarioDescriptionAr: "إصدار فاتورة بيع ضريبية معتمدة عبر ZATCA بالأجل",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "11201 - العملاء والذمم المدينة", "Accounts Receivable", "إجمالي قيمة الفاتورة شاملة الضريبة (مدين)"),
                        new("Credit", "41101 - إيرادات مبيعات المنتجات", "Sales Revenue", "قيمة البضاعة قبل الضريبة (دائن)"),
                        new("Credit", "21201 - ضريبة القيمة المضافة المخرجات", "Output VAT Payable", "قيمة ضريبة الـ 15% المستحقة للهيئة (دائن)")
                    }
                ),
                new(
                    TransactionTitleAr: "تكوين مخصص الخسائر الائتمانية المتوقعة ECL",
                    TransactionTitleEn: "Provision for Expected Credit Losses (ECL)",
                    ScenarioDescriptionAr: "إثبات مخصص ديون مشكوك في تحصيلها بناءً على معايير IFRS 9",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "53105 - مخصص ديون مشكوك في تحصيلها", "ECL Expense", "تحميل قائمة الدخل بمصروف المخصص (مدين)"),
                        new("Credit", "11202 - مجمع مخصص خسائر الائتمان ECL", "Allowance for ECL", "حساب أصل مكمل سالب بالمركز المالي (دائن)")
                    }
                )
            }
        ));

        // 3. IAS 2: المخزون السلعي
        Register(AccountingStandardGuidance.Create(
            standardCode: "IAS 2",
            standardTitleAr: "معيار المحاسبة الدولي 2: المخزون",
            standardTitleEn: "IAS 2: Inventories",
            recognitionCriteriaAr: "يُقاس المخزون بالتكلفة أو صافي القيمة القابلة للتحقق (NRV) أيهما أقل، وتشمل التكلفة جميع مصاريف الشراء، والرسوم الجمركية غير المستردة، وتكاليف النقل والمناولة المباشرة.",
            debitRuleAr: "يكون الحساب مديناً عند إضافة مشتريات مخزنية جديدة، استلام بضائع من الموردين، أو استلام مرتجعات مبيعات صالحة.",
            creditRuleAr: "يكون الحساب دائناً عند بيع البضاعة وتحويل تكلفتها إلى تكلفة المبيعات (COGS)، أو إثبات عجز وتالف المخزون.",
            zatcaTaxImpactAr: "ضريبة القيمة المضافة المدفوعة على الشراء تخصم كمدخلات مستردة ولا تدخل ضمن تكلفة المخزون إذا كانت الشركة خاضعة لنظام الضريبة ومسجلة.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "شراء بضاعة للمخزن بالأجل من مورد محلي",
                    TransactionTitleEn: "Inventory purchase on credit with input VAT",
                    ScenarioDescriptionAr: "استلام بضاعة للمستودع مع فاتورة ضريبية رسمية",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "11301 - مخزون البضائع الجاهزة", "Merchandise Inventory", "قيمة البضاعة الخالصة بالتكلفة (مدين)"),
                        new("Debit", "11401 - ضريبة المدخلات المستردة", "Input VAT Recoverable", "ضريبة الـ 15% المدفوعة للمورد (مدين)"),
                        new("Credit", "21101 - الموردون والذمم الدائنة", "Accounts Payable", "إجمالي الالتزام للمورد شامل الضريبة (دائن)")
                    }
                ),
                new(
                    TransactionTitleAr: "إثبات تكلفة البضاعة المباعة عند تسليم المنتجات",
                    TransactionTitleEn: "Record Cost of Goods Sold (COGS)",
                    ScenarioDescriptionAr: "صرف البضاعة من المستودع للعميل بموجب إذن صرف",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "51101 - تكلفة البضاعة المباعة COGS", "Cost of Goods Sold", "تحميل تكلفة البضاعة على قائمة الدخل (مدين)"),
                        new("Credit", "11301 - مخزون البضائع الجاهزة", "Merchandise Inventory", "تخفيض رصيد المخزون في المركز المالي (دائن)")
                    }
                )
            }
        ));

        // 4. IAS 16: العقارات والآلات والمعدات (الأصول الثابتة)
        Register(AccountingStandardGuidance.Create(
            standardCode: "IAS 16",
            standardTitleAr: "معيار المحاسبة الدولي 16: العقارات والآلات والمعدات (الأصول الثابتة)",
            standardTitleEn: "IAS 16: Property, Plant and Equipment (PPE)",
            recognitionCriteriaAr: "يُعترف بالأصل الثابت إذا كان من المحتمل تدفق منافع اقتصادية مستقبلية للشركة وتزيد مدة استخدامه عن سنة مالية واحدة، وتُقاس التكلفة بقيمة الشراء مضافاً إليها كافة النفقات التجهيزية حتى يصبح الأصل صالحاً للتشغيل.",
            debitRuleAr: "يكون الحساب مديناً عند اقتناء أصل رأسمالي جديد، أو إجراء تحسينات جوهرية تطيل العمر الإنتاجي للأصل.",
            creditRuleAr: "يكون الحساب دائناً عند استبعاد الأصل بالبيع أو التكهين أو الاستبدال بعد إقفال مجمع استهلاكه.",
            zatcaTaxImpactAr: "تُخصم ضريبة مدخلات الأصول الرأسمالية كاملة في إقرار فترة الشراء، مع تطبيق شرط احتفاظ ZATCA بالأصول الرأسمالية وتعديل الضريبة إذا تم بيعها خلال فترات التعديل المقررة.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "شراء أجهزة ومعدات تقنية بالبنك",
                    TransactionTitleEn: "Acquisition of IT equipment via bank",
                    ScenarioDescriptionAr: "شراء خوادم وأجهزة للشركة مع فاتورة ضريبية",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "12103 - الآلات والمعدات التقنية", "IT & Machinery Equipment", "قيمة الأصل الرأسمالي الدفترية (مدين)"),
                        new("Debit", "11401 - ضريبة المدخلات المستردة", "Input VAT Recoverable", "ضريبة الـ 15% المدفوعة القابلة للخصم (مدين)"),
                        new("Credit", "11102 - البنك الجاري", "Bank Current Account", "قيمة المبلغ المصروف بالبنك (دائن)")
                    }
                ),
                new(
                    TransactionTitleAr: "إثبات قسط استهلاك الأصول الثابتة الشهري",
                    TransactionTitleEn: "Monthly depreciation expense",
                    ScenarioDescriptionAr: "توزيع تكلفة الأصل على عمره الإنتاجي وفق طريقة القسط الثابت",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "53102 - مصروف استهلاك الأصول الثابتة", "Depreciation Expense", "عبء الاستهلاك المحمل على قائمة الدخل (مدين)"),
                        new("Credit", "12102 - مجمع استهلاك الآلات والمعدات", "Accumulated Depreciation", "حساب مكمل سالب للأصل بالمركز المالي (دائن)")
                    }
                )
            }
        ));

        // 5. IFRS 16: عقود الإيجار (أصول حق الاستخدام والتزامات الإيجار)
        Register(AccountingStandardGuidance.Create(
            standardCode: "IFRS 16",
            standardTitleAr: "المعيار الدولي للتقرير المالي 16: عقود الإيجار",
            standardTitleEn: "IFRS 16: Leases (Right-of-Use Assets & Lease Liabilities)",
            recognitionCriteriaAr: "يلزم المستأجر بالاعتراف بجميع عقود الإيجار (التي تتجاوز 12 شهراً) كأصل حق استخدام (ROU Asset) مقابل التزام إيجار بالقيمة الحالية لدفعات الإيجار المخصومة بمعدل الفائدة الضمني.",
            debitRuleAr: "يكون أصل حق الاستخدام مديناً عند توقيع العقد، وتكون التزامات الإيجار مدينة عند سداد أقساط الإيجار الدورية للمؤجر.",
            creditRuleAr: "تكون التزامات الإيجار دائنة بالقيمة الحالية للدفعات المستقبلية عند بدء العقد وبعبء الفائدة التمويلية الدورية.",
            zatcaTaxImpactAr: "تستحق ضريبة القيمة المضافة على دفعات الإيجار بموجب فواتير ضريبية نظامية تصدر من المؤجر، وتخصم في إقرار الفترة التي صدرت فيها الفاتورة.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "إثبات عقد إيجار مقر الشركة (ROU Asset)",
                    TransactionTitleEn: "Recognition of Right-of-Use Asset and Lease Liability",
                    ScenarioDescriptionAr: "إثبات أصل حق الاستخدام والالتزام المقابل لمدة 3 سنوات",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "12104 - أصول حق الاستخدام (ROU)", "Right-of-Use Assets", "القيمة الحالية لمدفوعات الإيجار (مدين)"),
                        new("Credit", "21302 - التزامات عقود الإيجار المتداولة", "Lease Liability - Current", "أقساط العام الأول المستحقة (دائن)"),
                        new("Credit", "22101 - التزامات عقود الإيجار غير المتداولة", "Lease Liability - Non-Current", "أقساط الأعوام اللاحقة المتبقية (دائن)")
                    }
                )
            }
        ));

        // 6. IFRS 15: الإيرادات من العقود مع العملاء
        Register(AccountingStandardGuidance.Create(
            standardCode: "IFRS 15",
            standardTitleAr: "المعيار الدولي للتقرير المالي 15: الإيراد من العقود مع العملاء",
            standardTitleEn: "IFRS 15: Revenue from Contracts with Customers",
            recognitionCriteriaAr: "يُعترف بالإيراد عند استيفاء التزام الأداء بنقل السلعة أو الخدمة المتفق عليها للعميل وحصوله على السيطرة، وفق الخطوات الخمس للمعيار، واستبعاد المبالغ المحصلة نيابة عن أطراف ثالثة (كضريبة القيمة المضافة).",
            debitRuleAr: "حساب الإيرادات دائن بطبيعته؛ ويكون مديناً فقط في حالات استثنائية مثل إقفال نهاية السنة المالية في الأرباح والخسائر، أو إثبات مردودات وتخفيضات تجارية مباشرة.",
            creditRuleAr: "يكون الحساب دائناً عند تحقيق المبيعات وإصدار الفواتير أو إنجاز المراحل التعاقدية المتفق عليها.",
            zatcaTaxImpactAr: "الإيراد المسجل في هذا الحساب يمثل الأساس الخاضع لضريبة القيمة المضافة 15% في الخانة رقم (1) من إقرار الهيئة ZATCA، ويجب تطابقه التام مع مجموع فواتير المنصة.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "إثبات مبيعات منتجات نقدية بنكية مع ضريبة ZATCA",
                    TransactionTitleEn: "Point of Sale (POS) Cash/Card Sales with VAT",
                    ScenarioDescriptionAr: "مبيعات يومية للمستهلك النهائي مسددة عبر نقاط البيع (مدى / فيزا)",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "11102 - البنك / نقاط البيع (POS)", "Bank POS Clearing", "المبلغ المقبوض المحول للبنك (مدين)"),
                        new("Credit", "41101 - إيرادات مبيعات المنتجات", "Product Sales Revenue", "صافي المبيعات بدون ضريبة (دائن)"),
                        new("Credit", "21201 - ضريبة القيمة المضافة المخرجات", "Output VAT Payable", "ضريبة الـ 15% المستحقة لـ ZATCA (دائن)")
                    }
                )
            }
        ));

        // 7. IAS 19: منافع الموظفين ومكافأة نهاية الخدمة
        Register(AccountingStandardGuidance.Create(
            standardCode: "IAS 19",
            standardTitleAr: "معيار المحاسبة الدولي 19: منافع الموظفين ومكافأة نهاية الخدمة (EOSB)",
            standardTitleEn: "IAS 19: Employee Benefits (End-of-Service Benefits EOSB)",
            recognitionCriteriaAr: "تُقاس التزامات منافع الموظفين طويلة الأجل (مكافأة نهاية الخدمة المقررة بنظام العمل السعودي) باستخدام طريقة وحدة الائتمان المقدرة (Actuarial Valuation)، مع إثبات تكلفة الخدمة الحالية في الأرباح والخسائر.",
            debitRuleAr: "تكون التزامات نهاية الخدمة مدينة عند تصفية مستحقات الموظف المنتهية خدماته والصرف له فعلياً.",
            creditRuleAr: "تكون التزامات نهاية الخدمة دائنة عند استحقاق مخصص تكلفة الخدمة الدورية وإضافتها لحساب المخصص.",
            zatcaTaxImpactAr: "وفق لوائح الزكاة وضريبة الدخل بالسعودية، لا يُقبل المخصص المحتسب إلا في حدود ما صُرف فعلياً للموظفين خلال العام الزكوي أو ما تم اعتماده بشروط محددة.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "إثبات مخصص مكافأة نهاية الخدمة الشهري",
                    TransactionTitleEn: "Monthly EOSB Provision accrual",
                    ScenarioDescriptionAr: "استحقاق تكلفة نهاية الخدمة الشهرية لموظفي الشركة",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "53106 - مصروف مكافأة نهاية الخدمة", "EOSB Expense", "تحميل المصروف على قائمة الدخل (مدين)"),
                        new("Credit", "22201 - مخصص مكافأة نهاية الخدمة", "EOSB Provision", "زيادة الالتزام طويل الأجل بالمركز المالي (دائن)")
                    }
                ),
                new(
                    TransactionTitleAr: "صرف مستحقات موظف مستقيل من البنك",
                    TransactionTitleEn: "Settlement of EOSB to resigned employee",
                    ScenarioDescriptionAr: "تحويل المخالصة النهائية والمكافأة لحساب الموظف البنكي",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "22201 - مخصص مكافأة نهاية الخدمة", "EOSB Provision", "تخفيض التزام المخصص المسدد (مدين)"),
                        new("Credit", "11102 - البنك الجاري", "Bank Current Account", "صرف المبلغ الفعلي من البنك (دائن)")
                    }
                )
            }
        ));

        // 8. ZATCA VAT: ضريبة القيمة المضافة (المدخلات والمخرجات)
        Register(AccountingStandardGuidance.Create(
            standardCode: "ZATCA VAT",
            standardTitleAr: "نظام ضريبة القيمة المضافة ولوائح الفوترة الإلكترونية (ZATCA Phase 2)",
            standardTitleEn: "ZATCA VAT Regulations & Phase 2 E-Invoicing",
            recognitionCriteriaAr: "تُقيد ضريبة المخرجات كالتزام على المنشأة لصالح هيئة الزكاة والضريبة والجمارك عند إصدار فاتورة ضريبية، وتُقيد ضريبة المدخلات كأصل متداول مسترد عند حيازة فواتير شراء ضريبية نظامية تحمل الـ QR Code والرقم الضريبي للمورد.",
            debitRuleAr: "حساب ضريبة المدخلات مدين بطبيعته عند الشراء، وحساب ضريبة المخرجات يكون مديناً عند سداد الإقرار الضريبي ربع السنوي أو الشهري لحساب الهيئة عبر نظام سداد.",
            creditRuleAr: "حساب ضريبة المخرجات دائن بطبيعته عند البيع، وحساب ضريبة المدخلات يكون دائناً عند تسويته ومقاصته مع المخرجات في نهاية الفترة الضريبية.",
            zatcaTaxImpactAr: "الربط المباشر مع منصة فاتورة (Fatoora Portal) عبر تشفير ECDSA و cryptographic stamp يضمن تطابق مبيعات وضرائب النظام مع سجلات الهيئة المركزية فوراً.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "تسوية الإقرار الضريبي وسداد صافي الضريبة لهيئة ZATCA",
                    TransactionTitleEn: "VAT Return settlement and net tax payment to ZATCA",
                    ScenarioDescriptionAr: "إقفال ضريبة المدخلات مع ضريبة المخرجات وسداد الفارق لحساب الهيئة برقم سداد",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "21201 - ضريبة القيمة المضافة المخرجات", "Output VAT Payable", "إقفال رصيد ضريبة المبيعات المستحقة (مدين)"),
                        new("Credit", "11401 - ضريبة المدخلات المستردة", "Input VAT Recoverable", "إقفال رصيد ضريبة المشتريات المخصومة (دائن)"),
                        new("Credit", "11102 - البنك الجاري (سداد ZATCA)", "Bank - ZATCA SADAD", "سداد صافي الفارق المستحق للهيئة بالبنك (دائن)")
                    }
                )
            }
        ));

        // 9. IAS 1: رأس المال وحقوق الملكية والاحتياطيات
        Register(AccountingStandardGuidance.Create(
            standardCode: "IAS 1",
            standardTitleAr: "معيار المحاسبة الدولي 1: عرض القوائم المالية (حقوق الملكية ورأس المال)",
            standardTitleEn: "IAS 1: Presentation of Financial Statements (Equity & Reserves)",
            recognitionCriteriaAr: "تمثل حقوق الملكية الحصة المتبقية في أصول المنشأة بعد خصم جميع التزاماتها، ويُثبت رأس المال بالقيم المنصوص عليها في عقد التأسيس والسجل التجاري، مع تجنيب الاحتياطي النظامي 10% من صافي الأرباح السنوية وفق نظام الشركات السعودي.",
            debitRuleAr: "تكون حقوق الملكية مدينة عند توزيع أرباح نقدية على الشركاء أو تخفيض رأس المال أو إقفال خسائر تشغيلية.",
            creditRuleAr: "تكون حقوق الملكية دائنة بطبيعتها عند إيداع رأس المال، أو تحقيق صافي أرباح سنوية، أو تحويل مبالغ للاحتياطي النظامي.",
            zatcaTaxImpactAr: "تشكل حقوق الملكية والأرباح المبقاة والاحتياطيات أساس وعاء الزكاة الشرعية (الجانب التمويلي للوعاء) وفق معادلة الهيئة العامة للزكاة والدخل.",
            typicalJournalEntries: new List<SampleJournalEntry>
            {
                new(
                    TransactionTitleAr: "إيداع رأس مال التأسيس بحساب الشركة البنكي",
                    TransactionTitleEn: "Deposit of company initial share capital",
                    ScenarioDescriptionAr: "إيداع حصص الشركاء النقدية بموجب عقد التأسيس والسجل التجاري",
                    Legs: new List<SampleJournalEntryLeg>
                    {
                        new("Debit", "11102 - البنك الجاري", "Bank Current Account", "دخول السيولة النقدية في حساب المنشأة (مدين)"),
                        new("Credit", "31101 - رأس مال الشركاء المدفوع", "Paid-in Share Capital", "إثبات حقوق الشركاء ورأس المال الدائن (دائن)")
                    }
                )
            }
        ));
    }

    private static void Register(AccountingStandardGuidance guidance)
    {
        Standards[guidance.StandardCode] = guidance;
    }

    public static AccountingStandardGuidance? GetByCode(string code)
    {
        Standards.TryGetValue(code, out var guidance);
        return guidance;
    }

    public static IReadOnlyCollection<AccountingStandardGuidance> GetAll() => Standards.Values.ToList().AsReadOnly();
}
