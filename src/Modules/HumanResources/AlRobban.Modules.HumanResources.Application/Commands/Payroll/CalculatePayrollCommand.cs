using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Payroll;

public record PayrollEmployeeAdjustment(
    Guid EmployeeId,
    decimal OvertimeAmount = 0,
    decimal AbsenceDeduction = 0,
    decimal LoanDeduction = 0,
    decimal OtherDeductions = 0,
    string? Notes = null
);

public record CalculatePayrollCommand(
    Guid CompanyId,
    int Year,
    int Month,
    List<PayrollEmployeeAdjustment>? Adjustments = null,
    string? Notes = null
) : IRequest<Result<PayrollPeriodDto>>;

public class CalculatePayrollCommandHandler : IRequestHandler<CalculatePayrollCommand, Result<PayrollPeriodDto>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;
    private readonly IEmployeeRepository _employeeRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public CalculatePayrollCommandHandler(
        IPayrollPeriodRepository payrollRepo,
        IEmployeeRepository employeeRepo,
        ICurrentTenantContext tenantContext)
    {
        _payrollRepo = payrollRepo;
        _employeeRepo = employeeRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<PayrollPeriodDto>> Handle(CalculatePayrollCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId.GetValueOrDefault();
        if (tenantId == Guid.Empty)
        {
            tenantId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        // Check if payroll period already exists
        var existingPeriod = await _payrollRepo.GetByPeriodAsync(request.CompanyId, request.Year, request.Month, cancellationToken);
        if (existingPeriod != null && existingPeriod.Status == PayrollStatus.PostedToGl)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Conflict("Payroll.AlreadyPosted", "تم ترحيل مسيّر هذا الشهر إلى الحسابات العامة مسبقاً ولا يمكن إعادة احتسابه."));
        }

        var startDate = new DateTime(request.Year, request.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var payrollNumber = $"PAY-{request.Year}-{request.Month:D2}";

        var period = existingPeriod ?? PayrollPeriod.Create(
            tenantId,
            request.CompanyId,
            payrollNumber,
            request.Year,
            request.Month,
            startDate,
            endDate,
            request.Notes,
            "SystemAdmin"
        );

        period.ClearLines();

        var activeEmployees = await _employeeRepo.GetListAsync(request.CompanyId, activeOnly: true, cancellationToken);
        if (!activeEmployees.Any())
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.NoEmployees", "لا يوجد موظفون نشطون لاحتساب الرواتب لهم."));
        }

        var adjustmentsDict = request.Adjustments?.ToDictionary(a => a.EmployeeId) ?? new Dictionary<Guid, PayrollEmployeeAdjustment>();

        foreach (var emp in activeEmployees)
        {
            var (empGosi, compGosi) = emp.CalculateMonthlyGosi();

            decimal overtime = 0;
            decimal absence = 0;
            decimal loan = 0;
            decimal otherDed = 0;
            string? notes = null;

            if (adjustmentsDict.TryGetValue(emp.Id, out var adj))
            {
                overtime = adj.OvertimeAmount;
                absence = adj.AbsenceDeduction;
                loan = adj.LoanDeduction;
                otherDed = adj.OtherDeductions;
                notes = adj.Notes;
            }

            var line = PayrollLine.Create(
                period.Id,
                emp.Id,
                emp.EmployeeNumber,
                emp.FullNameAr,
                emp.FullNameEn,
                emp.NationalIdOrIqama,
                emp.BankCode,
                emp.Iban,
                emp.BasicSalary,
                emp.HousingAllowance,
                emp.TransportationAllowance,
                emp.OtherAllowances,
                overtime,
                empGosi,
                compGosi,
                absence,
                loan,
                otherDed,
                notes
            );

            period.AddLine(line);
        }

        if (existingPeriod == null)
        {
            await _payrollRepo.AddAsync(period, cancellationToken);
        }
        else
        {
            await _payrollRepo.UpdateAsync(period, cancellationToken);
        }

        await _payrollRepo.SaveChangesAsync(cancellationToken);

        var lineDtos = period.Lines.Select(l => new PayrollLineDto(
            l.Id,
            l.PayrollPeriodId,
            l.EmployeeId,
            l.EmployeeNumber,
            l.EmployeeNameAr,
            l.EmployeeNameEn,
            l.NationalIdOrIqama,
            l.BankCode,
            l.Iban,
            l.BasicSalary,
            l.HousingAllowance,
            l.TransportationAllowance,
            l.OtherAllowances,
            l.OvertimeAmount,
            l.GrossSalary,
            l.EmployeeGosiDeduction,
            l.CompanyGosiContribution,
            l.AbsenceDeduction,
            l.LoanDeduction,
            l.OtherDeductions,
            l.TotalDeductions,
            l.NetSalary,
            l.Notes
        )).ToList();

        var dto = new PayrollPeriodDto(
            period.Id,
            period.CompanyId,
            period.PayrollNumber,
            period.PeriodYear,
            period.PeriodMonth,
            period.StartDate,
            period.EndDate,
            period.Status,
            period.EmployeeCount,
            period.TotalBasicSalary,
            period.TotalHousingAllowance,
            period.TotalTransportationAllowance,
            period.TotalOtherAllowances,
            period.TotalOvertime,
            period.TotalGrossSalary,
            period.TotalEmployeeGosiDeduction,
            period.TotalCompanyGosiContribution,
            period.TotalAbsenceDeductions,
            period.TotalLoanDeductions,
            period.TotalOtherDeductions,
            period.TotalDeductions,
            period.TotalNetSalary,
            period.JournalEntryId,
            period.JournalEntryNumber,
            period.PostedToGlAtUtc,
            period.WpsExportedAtUtc,
            period.WpsFileName,
            period.Notes,
            lineDtos,
            period.PaymentJournalEntryId,
            period.PaymentJournalEntryNumber,
            period.PaidAtUtc,
            period.PaymentBankAccountId
        );

        return Result.Success(dto);
    }
}
