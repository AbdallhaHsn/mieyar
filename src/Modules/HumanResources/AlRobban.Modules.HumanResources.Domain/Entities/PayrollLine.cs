using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class PayrollLine : Entity<Guid>
{
    public Guid PayrollPeriodId { get; private set; }
    public Guid EmployeeId { get; private set; }

    public string EmployeeNumber { get; private set; } = string.Empty;
    public string EmployeeNameAr { get; private set; } = string.Empty;
    public string EmployeeNameEn { get; private set; } = string.Empty;
    public string NationalIdOrIqama { get; private set; } = string.Empty;

    public string BankCode { get; private set; } = string.Empty;
    public string Iban { get; private set; } = string.Empty;

    // Earnings (الاستحقاقات)
    public decimal BasicSalary { get; private set; }
    public decimal HousingAllowance { get; private set; }
    public decimal TransportationAllowance { get; private set; }
    public decimal OtherAllowances { get; private set; }
    public decimal OvertimeAmount { get; private set; }
    public decimal GrossSalary => BasicSalary + HousingAllowance + TransportationAllowance + OtherAllowances + OvertimeAmount;

    // Deductions (الاستقطاعات)
    public decimal EmployeeGosiDeduction { get; private set; }
    public decimal CompanyGosiContribution { get; private set; }
    public decimal AbsenceDeduction { get; private set; }
    public decimal LoanDeduction { get; private set; }
    public decimal OtherDeductions { get; private set; }
    public decimal TotalDeductions => EmployeeGosiDeduction + AbsenceDeduction + LoanDeduction + OtherDeductions;

    // Net Payable (صافي الراتب المستحق للتحويل البنكي)
    public decimal NetSalary => Math.Max(0, GrossSalary - TotalDeductions);

    public string? Notes { get; private set; }

    private PayrollLine() { }

    public static PayrollLine Create(
        Guid payrollPeriodId,
        Guid employeeId,
        string employeeNumber,
        string employeeNameAr,
        string employeeNameEn,
        string nationalIdOrIqama,
        string bankCode,
        string iban,
        decimal basicSalary,
        decimal housingAllowance,
        decimal transportationAllowance,
        decimal otherAllowances,
        decimal overtimeAmount,
        decimal employeeGosiDeduction,
        decimal companyGosiContribution,
        decimal absenceDeduction = 0,
        decimal loanDeduction = 0,
        decimal otherDeductions = 0,
        string? notes = null)
    {
        return new PayrollLine
        {
            Id = Guid.NewGuid(),
            PayrollPeriodId = payrollPeriodId,
            EmployeeId = employeeId,
            EmployeeNumber = employeeNumber.Trim(),
            EmployeeNameAr = employeeNameAr.Trim(),
            EmployeeNameEn = string.IsNullOrWhiteSpace(employeeNameEn) ? employeeNameAr.Trim() : employeeNameEn.Trim(),
            NationalIdOrIqama = nationalIdOrIqama.Trim(),
            BankCode = bankCode.Trim().ToUpperInvariant(),
            Iban = iban.Trim().ToUpperInvariant(),
            BasicSalary = Math.Max(0, basicSalary),
            HousingAllowance = Math.Max(0, housingAllowance),
            TransportationAllowance = Math.Max(0, transportationAllowance),
            OtherAllowances = Math.Max(0, otherAllowances),
            OvertimeAmount = Math.Max(0, overtimeAmount),
            EmployeeGosiDeduction = Math.Max(0, employeeGosiDeduction),
            CompanyGosiContribution = Math.Max(0, companyGosiContribution),
            AbsenceDeduction = Math.Max(0, absenceDeduction),
            LoanDeduction = Math.Max(0, loanDeduction),
            OtherDeductions = Math.Max(0, otherDeductions),
            Notes = notes
        };
    }

    public void UpdateAdjustments(decimal overtimeAmount, decimal absenceDeduction, decimal loanDeduction, decimal otherDeductions, string? notes)
    {
        OvertimeAmount = Math.Max(0, overtimeAmount);
        AbsenceDeduction = Math.Max(0, absenceDeduction);
        LoanDeduction = Math.Max(0, loanDeduction);
        OtherDeductions = Math.Max(0, otherDeductions);
        Notes = notes;
    }
}
