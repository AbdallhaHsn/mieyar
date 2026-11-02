using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Queries;

public record GetPayrollPeriodsQuery(
    Guid CompanyId,
    int? Year = null
) : IRequest<Result<List<PayrollPeriodDto>>>;

public record GetPayrollPeriodByIdQuery(Guid Id) : IRequest<Result<PayrollPeriodDto>>;

public class GetPayrollPeriodsQueryHandler :
    IRequestHandler<GetPayrollPeriodsQuery, Result<List<PayrollPeriodDto>>>,
    IRequestHandler<GetPayrollPeriodByIdQuery, Result<PayrollPeriodDto>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;

    public GetPayrollPeriodsQueryHandler(IPayrollPeriodRepository payrollRepo)
    {
        _payrollRepo = payrollRepo;
    }

    public async Task<Result<List<PayrollPeriodDto>>> Handle(GetPayrollPeriodsQuery request, CancellationToken cancellationToken)
    {
        var periods = await _payrollRepo.GetListAsync(request.CompanyId, request.Year, cancellationToken);
        var dtos = periods.Select(p => new PayrollPeriodDto(
            p.Id,
            p.CompanyId,
            p.PayrollNumber,
            p.PeriodYear,
            p.PeriodMonth,
            p.StartDate,
            p.EndDate,
            p.Status,
            p.EmployeeCount,
            p.TotalBasicSalary,
            p.TotalHousingAllowance,
            p.TotalTransportationAllowance,
            p.TotalOtherAllowances,
            p.TotalOvertime,
            p.TotalGrossSalary,
            p.TotalEmployeeGosiDeduction,
            p.TotalCompanyGosiContribution,
            p.TotalAbsenceDeductions,
            p.TotalLoanDeductions,
            p.TotalOtherDeductions,
            p.TotalDeductions,
            p.TotalNetSalary,
            p.JournalEntryId,
            p.JournalEntryNumber,
            p.PostedToGlAtUtc,
            p.WpsExportedAtUtc,
            p.WpsFileName,
            p.Notes,
            null,
            p.PaymentJournalEntryId,
            p.PaymentJournalEntryNumber,
            p.PaidAtUtc,
            p.PaymentBankAccountId
        )).ToList();

        return Result.Success(dtos);
    }

    public async Task<Result<PayrollPeriodDto>> Handle(GetPayrollPeriodByIdQuery request, CancellationToken cancellationToken)
    {
        var p = await _payrollRepo.GetByIdWithLinesAsync(request.Id, cancellationToken);
        if (p == null)
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.NotFound", "مسير الرواتب غير موجود."));
        }

        var lineDtos = p.Lines.Select(l => new PayrollLineDto(
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
            p.Id,
            p.CompanyId,
            p.PayrollNumber,
            p.PeriodYear,
            p.PeriodMonth,
            p.StartDate,
            p.EndDate,
            p.Status,
            p.EmployeeCount,
            p.TotalBasicSalary,
            p.TotalHousingAllowance,
            p.TotalTransportationAllowance,
            p.TotalOtherAllowances,
            p.TotalOvertime,
            p.TotalGrossSalary,
            p.TotalEmployeeGosiDeduction,
            p.TotalCompanyGosiContribution,
            p.TotalAbsenceDeductions,
            p.TotalLoanDeductions,
            p.TotalOtherDeductions,
            p.TotalDeductions,
            p.TotalNetSalary,
            p.JournalEntryId,
            p.JournalEntryNumber,
            p.PostedToGlAtUtc,
            p.WpsExportedAtUtc,
            p.WpsFileName,
            p.Notes,
            lineDtos,
            p.PaymentJournalEntryId,
            p.PaymentJournalEntryNumber,
            p.PaidAtUtc,
            p.PaymentBankAccountId
        );

        return Result.Success(dto);
    }
}
