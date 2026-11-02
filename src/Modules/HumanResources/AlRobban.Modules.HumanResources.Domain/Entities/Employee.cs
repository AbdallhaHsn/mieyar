using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class Employee : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string EmployeeNumber { get; private set; } = string.Empty; // EMP-001

    // Single-Entry Bilingual Names
    public string FirstNameAr { get; private set; } = string.Empty;
    public string LastNameAr { get; private set; } = string.Empty;
    public string FullNameAr { get; private set; } = string.Empty;

    public string FirstNameEn { get; private set; } = string.Empty;
    public string LastNameEn { get; private set; } = string.Empty;
    public string FullNameEn { get; private set; } = string.Empty;

    // Identification & Demographics
    public string NationalIdOrIqama { get; private set; } = string.Empty; // 10 digits
    public string Nationality { get; private set; } = "سعودي";
    public bool IsSaudi { get; private set; } = true;
    public Gender Gender { get; private set; } = Gender.Male;
    public DateTime? DateOfBirth { get; private set; }
    public string? MobileNumber { get; private set; }
    public string? Email { get; private set; }

    // Job & Department
    public Guid? DepartmentId { get; private set; }
    public string DepartmentName { get; private set; } = string.Empty;
    public string JobTitleAr { get; private set; } = string.Empty;
    public string JobTitleEn { get; private set; } = string.Empty;
    public Guid? CostCenterId { get; private set; }
    public Guid? BranchId { get; private set; }

    // Employment Details
    public DateTime HireDate { get; private set; }
    public ContractType ContractType { get; private set; } = ContractType.Limited;
    public DateTime? ContractStartDate { get; private set; }
    public DateTime? ContractEndDate { get; private set; }
    public EmployeeStatus Status { get; private set; } = EmployeeStatus.Active;

    // Banking Details for Wages Protection System (WPS / Mudad)
    public string BankCode { get; private set; } = "RJHI"; // Al Rajhi, Alinma, NCB, etc.
    public string BankName { get; private set; } = "مصرف الراجحي";
    public string Iban { get; private set; } = string.Empty; // SA... 24 characters

    // Salary Structure (SAR)
    public decimal BasicSalary { get; private set; }
    public decimal HousingAllowance { get; private set; }
    public decimal TransportationAllowance { get; private set; }
    public decimal OtherAllowances { get; private set; }

    public decimal GrossSalary => BasicSalary + HousingAllowance + TransportationAllowance + OtherAllowances;

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Employee() { }

    public static Employee Create(
        Guid tenantId,
        Guid companyId,
        string employeeNumber,
        string firstNameAr,
        string lastNameAr,
        string firstNameEn,
        string lastNameEn,
        string nationalIdOrIqama,
        string nationality,
        bool isSaudi,
        string jobTitleAr,
        string jobTitleEn,
        DateTime hireDate,
        decimal basicSalary,
        decimal housingAllowance,
        decimal transportationAllowance,
        decimal otherAllowances,
        string bankCode,
        string bankName,
        string iban,
        Guid? departmentId = null,
        string? departmentName = null,
        Guid? costCenterId = null,
        Guid? branchId = null,
        ContractType contractType = ContractType.Limited,
        DateTime? contractStartDate = null,
        DateTime? contractEndDate = null,
        string? mobileNumber = null,
        string? email = null,
        Gender gender = Gender.Male,
        DateTime? dateOfBirth = null,
        string? createdBy = null)
    {
        var fNameAr = firstNameAr.Trim();
        var lNameAr = lastNameAr.Trim();
        var fNameEn = string.IsNullOrWhiteSpace(firstNameEn) ? fNameAr : firstNameEn.Trim();
        var lNameEn = string.IsNullOrWhiteSpace(lastNameEn) ? lNameAr : lastNameEn.Trim();

        return new Employee
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            EmployeeNumber = employeeNumber.Trim().ToUpperInvariant(),
            FirstNameAr = fNameAr,
            LastNameAr = lNameAr,
            FullNameAr = $"{fNameAr} {lNameAr}".Trim(),
            FirstNameEn = fNameEn,
            LastNameEn = lNameEn,
            FullNameEn = $"{fNameEn} {lNameEn}".Trim(),
            NationalIdOrIqama = nationalIdOrIqama.Trim(),
            Nationality = nationality.Trim(),
            IsSaudi = isSaudi,
            Gender = gender,
            DateOfBirth = dateOfBirth,
            MobileNumber = mobileNumber?.Trim(),
            Email = email?.Trim(),
            DepartmentId = departmentId,
            DepartmentName = departmentName ?? string.Empty,
            JobTitleAr = jobTitleAr.Trim(),
            JobTitleEn = string.IsNullOrWhiteSpace(jobTitleEn) ? jobTitleAr.Trim() : jobTitleEn.Trim(),
            CostCenterId = costCenterId,
            BranchId = branchId,
            HireDate = hireDate,
            ContractType = contractType,
            ContractStartDate = contractStartDate ?? hireDate,
            ContractEndDate = contractEndDate,
            Status = EmployeeStatus.Active,
            BankCode = bankCode.Trim().ToUpperInvariant(),
            BankName = bankName.Trim(),
            Iban = iban.Trim().ToUpperInvariant(),
            BasicSalary = Math.Max(0, basicSalary),
            HousingAllowance = Math.Max(0, housingAllowance),
            TransportationAllowance = Math.Max(0, transportationAllowance),
            OtherAllowances = Math.Max(0, otherAllowances),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void UpdateProfile(
        string firstNameAr,
        string lastNameAr,
        string firstNameEn,
        string lastNameEn,
        string jobTitleAr,
        string jobTitleEn,
        Guid? departmentId,
        string? departmentName,
        Guid? costCenterId,
        Guid? branchId,
        string? mobileNumber,
        string? email,
        string? updatedBy = null)
    {
        FirstNameAr = firstNameAr.Trim();
        LastNameAr = lastNameAr.Trim();
        FullNameAr = $"{FirstNameAr} {LastNameAr}".Trim();

        FirstNameEn = string.IsNullOrWhiteSpace(firstNameEn) ? FirstNameAr : firstNameEn.Trim();
        LastNameEn = string.IsNullOrWhiteSpace(lastNameEn) ? LastNameAr : lastNameEn.Trim();
        FullNameEn = $"{FirstNameEn} {LastNameEn}".Trim();

        JobTitleAr = jobTitleAr.Trim();
        JobTitleEn = string.IsNullOrWhiteSpace(jobTitleEn) ? JobTitleAr : jobTitleEn.Trim();

        DepartmentId = departmentId;
        DepartmentName = departmentName ?? string.Empty;
        CostCenterId = costCenterId;
        BranchId = branchId;
        MobileNumber = mobileNumber?.Trim();
        Email = email?.Trim();

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void UpdateSalaryAndBank(
        decimal basicSalary,
        decimal housingAllowance,
        decimal transportationAllowance,
        decimal otherAllowances,
        string bankCode,
        string bankName,
        string iban,
        string? updatedBy = null)
    {
        BasicSalary = Math.Max(0, basicSalary);
        HousingAllowance = Math.Max(0, housingAllowance);
        TransportationAllowance = Math.Max(0, transportationAllowance);
        OtherAllowances = Math.Max(0, otherAllowances);

        BankCode = bankCode.Trim().ToUpperInvariant();
        BankName = bankName.Trim();
        Iban = iban.Trim().ToUpperInvariant();

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void SetStatus(EmployeeStatus status, string? updatedBy = null)
    {
        Status = status;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    /// <summary>
    /// حساب حصة الموظف والمنشأة من التأمينات الاجتماعية السعودية (GOSI)
    /// الحد الأعلى للراتب الخاضع للاشتراك هو 45,000 ريال
    /// السعوديون: 9.75% موظف + 11.75% صاحب عمل (تشمل أخطار وساند ومعاشات)
    /// غير السعوديين: 0% موظف + 2% صاحب عمل (أخطار مهنية فقط)
    /// </summary>
    public (decimal EmployeeDeduction, decimal CompanyContribution) CalculateMonthlyGosi()
    {
        var subjectSalary = Math.Min(45000m, BasicSalary + HousingAllowance);

        if (IsSaudi)
        {
            var emp = Math.Round(subjectSalary * 0.0975m, 2);
            var comp = Math.Round(subjectSalary * 0.1175m, 2);
            return (emp, comp);
        }
        else
        {
            var comp = Math.Round(subjectSalary * 0.02m, 2);
            return (0m, comp);
        }
    }

    /// <summary>
    /// احتساب مكافأة نهاية الخدمة (EOSB) وفق المادتين 84 و 85 من نظام العمل السعودي
    /// </summary>
    public decimal CalculateEndOfServiceBenefit(DateTime calculationDate, EndOfServiceReason reason)
    {
        if (calculationDate < HireDate) return 0m;

        var totalDays = (calculationDate - HireDate).TotalDays;
        var years = (decimal)totalDays / 365.25m;

        if (years <= 0) return 0m;

        // الأجر الأخير المعتمد للمكافأة (الراتب الإجمالي: أساسي + بدلات)
        var lastWage = GrossSalary;

        // القاعدة الأساسية (المادة 84): نصف شهر عن كل سنة من السنوات الخمس الأولى، وشهر عن كل سنة تالية
        decimal baseBenefit = 0m;
        if (years <= 5m)
        {
            baseBenefit = years * (lastWage / 2m);
        }
        else
        {
            baseBenefit = (5m * (lastWage / 2m)) + ((years - 5m) * lastWage);
        }

        // تطبيق نسب الاستحقاق في حالة الاستقالة (المادة 85):
        decimal factor = reason switch
        {
            EndOfServiceReason.ContractEnd or EndOfServiceReason.CompanyTermination or EndOfServiceReason.ForceMajeure => 1.0m,
            EndOfServiceReason.ResignationLessThan2Years => (years < 2m) ? 0.0m : 1.0m,
            EndOfServiceReason.Resignation2To5Years => (years >= 2m && years < 5m) ? (1.0m / 3.0m) : 1.0m,
            EndOfServiceReason.Resignation5To10Years => (years >= 5m && years < 10m) ? (2.0m / 3.0m) : 1.0m,
            EndOfServiceReason.ResignationMoreThan10Years => 1.0m,
            _ => 1.0m
        };

        return Math.Round(baseBenefit * factor, 2);
    }
}
