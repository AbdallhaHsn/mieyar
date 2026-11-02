using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Payroll;

public record MarkPayrollAsPaidCommand(
    Guid PayrollPeriodId,
    string? Notes = null,
    Guid? BankAccountId = null
) : IRequest<Result<PayrollPeriodDto>>;

public class MarkPayrollAsPaidCommandHandler : IRequestHandler<MarkPayrollAsPaidCommand, Result<PayrollPeriodDto>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public MarkPayrollAsPaidCommandHandler(
        IPayrollPeriodRepository payrollRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _payrollRepo = payrollRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<PayrollPeriodDto>> Handle(MarkPayrollAsPaidCommand request, CancellationToken cancellationToken)
    {
        var period = await _payrollRepo.GetByIdWithLinesAsync(request.PayrollPeriodId, cancellationToken);
        if (period == null)
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.NotFound", "مسير الرواتب غير موجود."));
        }

        if (period.Status == PayrollStatus.Paid)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Conflict("Payroll.AlreadyPaid", "تم إثبات صرف وتحويل مسيّر الرواتب مسبقاً."));
        }

        if (period.Status != PayrollStatus.PostedToGl && period.Status != PayrollStatus.Approved)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Validation("Payroll.NotReadyForPayment", "يجب اعتماد أو ترحيل مسيّر الرواتب أولاً قبل إثبات الصرف والتحويل البنكي."));
        }

        // 1. Prepare GL Accounts for Disbursement
        // Debit: Accrued Salaries (21301)
        // Credit: Bank/Cash (11102 / 11103 / 11101)
        var accruedSalariesAccount = await _accountRepo.GetByCodeAsync(period.CompanyId, "21301", cancellationToken);
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(period.CompanyId, cancellationToken);

        accruedSalariesAccount ??= allAccounts.FirstOrDefault(a => a.AccountType == AccountType.Liability && a.IsPostable);

        var paymentBankAccount = request.BankAccountId.HasValue
            ? allAccounts.FirstOrDefault(a => a.Id == request.BankAccountId.Value)
            : allAccounts.FirstOrDefault(a => a.AccountCode == "11102" && a.IsPostable) // مصرف الراجحي
              ?? allAccounts.FirstOrDefault(a => a.AccountCode == "11103" && a.IsPostable) // البنك الأهلي
              ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111") && a.IsPostable); // أي بنك/صندوق

        if (accruedSalariesAccount != null && paymentBankAccount != null && period.TotalNetSalary > 0)
        {
            var paymentLines = new List<CreateJournalEntryLineRequest>
            {
                // Debit: Accrued Salaries (إقفال استحقاق الرواتب - مدين)
                new(
                    accruedSalariesAccount.Id,
                    Debit: period.TotalNetSalary,
                    Credit: 0m,
                    Description: $"سداد وإقفال الرواتب المستحقة للموظفين لشهر {period.PeriodMonth}/{period.PeriodYear} - مسيّر {period.PayrollNumber}",
                    CostCenterId: null
                ),
                // Credit: Bank / Cash (صرف من حساب البنك - دائن)
                new(
                    paymentBankAccount.Id,
                    Debit: 0m,
                    Credit: period.TotalNetSalary,
                    Description: $"تحويل أجور العاملين بنكياً (WPS) عبر {paymentBankAccount.NameAr} - مسيّر {period.PayrollNumber}",
                    CostCenterId: null
                )
            };

            var paymentEntryCommand = new CreateJournalEntryCommand(
                CompanyId: period.CompanyId,
                EntryDate: DateTime.UtcNow,
                EntryType: JournalEntryType.Daily,
                DescriptionAr: $"قيد صرف وتحويل رواتب العاملين لشهر {period.PeriodMonth}/{period.PeriodYear} - {paymentBankAccount.NameAr} - مسيّر {period.PayrollNumber}",
                DescriptionEn: $"Payroll Disbursement Entry for {period.PeriodMonth}/{period.PeriodYear} - {period.PayrollNumber}",
                ReferenceNumber: $"PAY-DISB-{period.PayrollNumber}",
                PostImmediately: true,
                Lines: paymentLines
            );

            var entryResult = await _mediator.Send(paymentEntryCommand, cancellationToken);
            if (entryResult.IsSuccess)
            {
                var entry = entryResult.Value;
                period.LinkPaymentGlJournalEntry(entry.Id, entry.EntryNumber, paymentBankAccount.Id, "SystemAdmin");
            }
            else
            {
                period.MarkAsPaid("SystemAdmin");
            }
        }
        else
        {
            period.MarkAsPaid("SystemAdmin");
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
