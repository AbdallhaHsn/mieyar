using System.Text;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class PayrollPeriod : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string PayrollNumber { get; private set; } = string.Empty; // PAY-2026-10
    public int PeriodYear { get; private set; }
    public int PeriodMonth { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public PayrollStatus Status { get; private set; } = PayrollStatus.Draft;

    // Totals
    public int EmployeeCount { get; private set; }
    public decimal TotalBasicSalary { get; private set; }
    public decimal TotalHousingAllowance { get; private set; }
    public decimal TotalTransportationAllowance { get; private set; }
    public decimal TotalOtherAllowances { get; private set; }
    public decimal TotalOvertime { get; private set; }
    public decimal TotalGrossSalary { get; private set; }

    // Deductions & GOSI
    public decimal TotalEmployeeGosiDeduction { get; private set; }
    public decimal TotalCompanyGosiContribution { get; private set; }
    public decimal TotalAbsenceDeductions { get; private set; }
    public decimal TotalLoanDeductions { get; private set; }
    public decimal TotalOtherDeductions { get; private set; }
    public decimal TotalDeductions { get; private set; }

    // Net Payable for WPS Bank Transfer
    public decimal TotalNetSalary { get; private set; }

    // GL Linkage (Accrual Entry)
    public Guid? JournalEntryId { get; private set; }
    public string? JournalEntryNumber { get; private set; }
    public DateTime? PostedToGlAtUtc { get; private set; }

    // GL Linkage (Payment / Disbursement Entry)
    public Guid? PaymentJournalEntryId { get; private set; }
    public string? PaymentJournalEntryNumber { get; private set; }
    public DateTime? PaidAtUtc { get; private set; }
    public Guid? PaymentBankAccountId { get; private set; }

    // WPS Export Info
    public DateTime? WpsExportedAtUtc { get; private set; }
    public string? WpsFileName { get; private set; }

    public string? Notes { get; private set; }

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<PayrollLine> _lines = new();
    public IReadOnlyCollection<PayrollLine> Lines => _lines.AsReadOnly();

    private PayrollPeriod() { }

    public static PayrollPeriod Create(
        Guid tenantId,
        Guid companyId,
        string payrollNumber,
        int year,
        int month,
        DateTime startDate,
        DateTime endDate,
        string? notes = null,
        string? createdBy = null)
    {
        return new PayrollPeriod
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            PayrollNumber = payrollNumber.Trim().ToUpperInvariant(),
            PeriodYear = year,
            PeriodMonth = month,
            StartDate = startDate,
            EndDate = endDate,
            Status = PayrollStatus.Draft,
            Notes = notes,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(PayrollLine line)
    {
        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        _lines.Clear();
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        EmployeeCount = _lines.Count;
        TotalBasicSalary = _lines.Sum(l => l.BasicSalary);
        TotalHousingAllowance = _lines.Sum(l => l.HousingAllowance);
        TotalTransportationAllowance = _lines.Sum(l => l.TransportationAllowance);
        TotalOtherAllowances = _lines.Sum(l => l.OtherAllowances);
        TotalOvertime = _lines.Sum(l => l.OvertimeAmount);
        TotalGrossSalary = _lines.Sum(l => l.GrossSalary);

        TotalEmployeeGosiDeduction = _lines.Sum(l => l.EmployeeGosiDeduction);
        TotalCompanyGosiContribution = _lines.Sum(l => l.CompanyGosiContribution);
        TotalAbsenceDeductions = _lines.Sum(l => l.AbsenceDeduction);
        TotalLoanDeductions = _lines.Sum(l => l.LoanDeduction);
        TotalOtherDeductions = _lines.Sum(l => l.OtherDeductions);
        TotalDeductions = _lines.Sum(l => l.TotalDeductions);

        TotalNetSalary = _lines.Sum(l => l.NetSalary);
        Status = _lines.Any() ? PayrollStatus.Calculated : PayrollStatus.Draft;
    }

    public void Approve(string? approvedBy = null)
    {
        if (Status != PayrollStatus.Calculated)
            throw new InvalidOperationException("لا يمكن اعتماد مسيّر رواتب لم يتم احتسابه بعد.");

        Status = PayrollStatus.Approved;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = approvedBy;
    }

    public void LinkGlJournalEntry(Guid journalEntryId, string journalEntryNumber, string? postedBy = null)
    {
        JournalEntryId = journalEntryId;
        JournalEntryNumber = journalEntryNumber;
        PostedToGlAtUtc = DateTime.UtcNow;
        Status = PayrollStatus.PostedToGl;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = postedBy;
    }

    public void LinkPaymentGlJournalEntry(Guid paymentEntryId, string paymentEntryNumber, Guid? bankAccountId, string? paidBy = null)
    {
        PaymentJournalEntryId = paymentEntryId;
        PaymentJournalEntryNumber = paymentEntryNumber;
        PaymentBankAccountId = bankAccountId;
        PaidAtUtc = DateTime.UtcNow;
        Status = PayrollStatus.Paid;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = paidBy;
    }

    public void MarkAsPaid(string? paidBy = null)
    {
        if (Status != PayrollStatus.PostedToGl && Status != PayrollStatus.Approved)
            throw new InvalidOperationException("يجب اعتماد أو ترحيل مسيّر الرواتب أولاً قبل إثبات الصرف والتحويل البنكي.");

        Status = PayrollStatus.Paid;
        PaidAtUtc = DateTime.UtcNow;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = paidBy;
    }

    public void UpdateLineAdjustments(Guid lineId, decimal overtimeAmount, decimal absenceDeduction, decimal loanDeduction, decimal otherDeductions, string? notes)
    {
        if (Status == PayrollStatus.PostedToGl || Status == PayrollStatus.Paid)
            throw new InvalidOperationException("لا يمكن تعديل بنود مسيّر رواتب تم ترحيله للقيود العامة.");

        var line = _lines.FirstOrDefault(l => l.Id == lineId);
        if (line == null)
            throw new InvalidOperationException("بند الموظف غير موجود في هذا المسيّر.");

        line.UpdateAdjustments(overtimeAmount, absenceDeduction, loanDeduction, otherDeductions, notes);
        RecalculateTotals();
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void RecordWpsExport(string fileName)
    {
        WpsExportedAtUtc = DateTime.UtcNow;
        WpsFileName = fileName;
    }

    /// <summary>
    /// توليد صيغة ملف حماية الأجور السعودي المعتمد (WPS SIF / CSV) المتوافق مع منصة مدد والبنوك السعودية
    /// Header: SCR (Salary Control Record)
    /// Lines: DED / SEK (Salary Employee Record)
    /// </summary>
    public string GenerateWpsFileContent(
        string establishmentMudadId, 
        string establishmentName, 
        string employerIban, 
        string employerBankCode)
    {
        var sb = new StringBuilder();
        var estId = string.IsNullOrWhiteSpace(establishmentMudadId) ? "7000000000" : establishmentMudadId.Trim();
        var estName = string.IsNullOrWhiteSpace(establishmentName) ? "شركة الربان للحلول المحاسبية" : establishmentName.Trim();
        var pBankCode = string.IsNullOrWhiteSpace(employerBankCode) ? "RJHI" : employerBankCode.Trim().ToUpperInvariant();
        var valDate = EndDate.ToString("yyyyMMdd");

        // Header: SCR,EmployerMudadId,PayerBankCode,ValueDate,EmployeeCount,TotalNetSalary,Currency,ReferenceNumber,EstablishmentName
        sb.AppendLine($"SCR,{estId},{pBankCode},{valDate},{EmployeeCount},{TotalNetSalary:F2},SAR,{PayrollNumber},{estName}");

        // Lines: DED,EmployeeID,BankCode,IBAN,NetSalary,BasicSalary,Housing,OtherEarnings,Deductions,EmployeeName
        foreach (var line in _lines)
        {
            var otherEarnings = line.TransportationAllowance + line.OtherAllowances + line.OvertimeAmount;
            var empName = !string.IsNullOrWhiteSpace(line.EmployeeNameAr) ? line.EmployeeNameAr : line.EmployeeNameEn;
            sb.AppendLine($"DED,{line.NationalIdOrIqama},{line.BankCode},{line.Iban},{line.NetSalary:F2},{line.BasicSalary:F2},{line.HousingAllowance:F2},{otherEarnings:F2},{line.TotalDeductions:F2},{empName}");
        }

        return sb.ToString();
    }
}
