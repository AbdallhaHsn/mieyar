using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Payroll;

public record UpdatePayrollLineCommand(
    Guid PayrollPeriodId,
    Guid PayrollLineId,
    decimal OvertimeAmount,
    decimal AbsenceDeduction,
    decimal LoanDeduction,
    decimal OtherDeductions,
    string? Notes = null
) : IRequest<Result<PayrollPeriodDto>>;

public class UpdatePayrollLineCommandHandler : IRequestHandler<UpdatePayrollLineCommand, Result<PayrollPeriodDto>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;

    public UpdatePayrollLineCommandHandler(IPayrollPeriodRepository payrollRepo)
    {
        _payrollRepo = payrollRepo;
    }

    public async Task<Result<PayrollPeriodDto>> Handle(UpdatePayrollLineCommand request, CancellationToken cancellationToken)
    {
        var period = await _payrollRepo.GetByIdWithLinesAsync(request.PayrollPeriodId, cancellationToken);
        if (period == null)
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.NotFound", "مسير الرواتب غير موجود."));
        }

        if (period.Status == PayrollStatus.PostedToGl || period.Status == PayrollStatus.Paid)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Conflict("Payroll.AlreadyLocked", "لا يمكن تعديل بنود مسيّر رواتب تم ترحيله للحسابات العامة أو صرفه."));
        }

        try
        {
            period.UpdateLineAdjustments(
                request.PayrollLineId,
                request.OvertimeAmount,
                request.AbsenceDeduction,
                request.LoanDeduction,
                request.OtherDeductions,
                request.Notes
            );
        }
        catch (Exception ex)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Validation("Payroll.UpdateFailed", ex.Message));
        }

        await _payrollRepo.UpdateAsync(period, cancellationToken);
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
