using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Payroll;

public record ApproveAndPostPayrollCommand(
    Guid PayrollPeriodId,
    string? Notes = null
) : IRequest<Result<PayrollPeriodDto>>;

public class ApproveAndPostPayrollCommandHandler : IRequestHandler<ApproveAndPostPayrollCommand, Result<PayrollPeriodDto>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public ApproveAndPostPayrollCommandHandler(
        IPayrollPeriodRepository payrollRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _payrollRepo = payrollRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<PayrollPeriodDto>> Handle(ApproveAndPostPayrollCommand request, CancellationToken cancellationToken)
    {
        var period = await _payrollRepo.GetByIdWithLinesAsync(request.PayrollPeriodId, cancellationToken);
        if (period == null)
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.NotFound", "مسير الرواتب غير موجود."));
        }

        if (period.Status == PayrollStatus.PostedToGl)
        {
            return Result.Failure<PayrollPeriodDto>(Error.Conflict("Payroll.AlreadyPosted", "تم ترحيل مسيّر الرواتب مسبقاً للحسابات العامة."));
        }

        if (period.Status == PayrollStatus.Draft && !period.Lines.Any())
        {
            return Result.Failure<PayrollPeriodDto>(Error.Validation("Payroll.Empty", "لا يمكن ترحيل مسير رواتب فارغ. قم باحتسابه أولاً."));
        }

        // Approve
        period.Approve("SystemAdmin");

        // Prepare GL Accounts
        // 53101: رواتب وبدلات الموظفين والإدارة
        // 21301: الرواتب والأجور المستحقة للموظفين
        var expenseAccount = await _accountRepo.GetByCodeAsync(period.CompanyId, "53101", cancellationToken);
        var accruedSalariesAccount = await _accountRepo.GetByCodeAsync(period.CompanyId, "21301", cancellationToken);

        if (expenseAccount == null || accruedSalariesAccount == null)
        {
            var allAccounts = await _accountRepo.GetAllByCompanyAsync(period.CompanyId, cancellationToken);
            expenseAccount ??= allAccounts.FirstOrDefault(a => a.AccountType == AccountType.Expense && a.IsPostable);
            accruedSalariesAccount ??= allAccounts.FirstOrDefault(a => a.AccountType == AccountType.Liability && a.IsPostable);
        }

        if (expenseAccount == null || accruedSalariesAccount == null)
        {
            return Result.Failure<PayrollPeriodDto>(Error.NotFound("Payroll.AccountsNotFound", "لم يتم العثور على حسابات الرواتب المناسبة في دليل الحسابات لترحيل القيد."));
        }

        var lines = new List<CreateJournalEntryLineRequest>();

        // 1. Debit Total Gross Salary (الرواتب الإجمالية والبدلات)
        if (period.TotalGrossSalary > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                expenseAccount.Id,
                Debit: period.TotalGrossSalary,
                Credit: 0m,
                Description: $"إجمالي رواتب وبدلات الموظفين لشهر {period.PeriodMonth}/{period.PeriodYear}",
                CostCenterId: null
            ));
        }

        // 2. Debit Total Company GOSI Contribution (مساهمة المنشأة في التأمينات الاجتماعية)
        if (period.TotalCompanyGosiContribution > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                expenseAccount.Id,
                Debit: period.TotalCompanyGosiContribution,
                Credit: 0m,
                Description: $"حصة المنشأة من التأمينات الاجتماعية لشهر {period.PeriodMonth}/{period.PeriodYear}",
                CostCenterId: null
            ));
        }

        // 3. Credit Accrued Net Salaries (صافي الرواتب المستحقة للموظفين)
        if (period.TotalNetSalary > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                accruedSalariesAccount.Id,
                Debit: 0m,
                Credit: period.TotalNetSalary,
                Description: $"صافي الرواتب المستحقة للتحويل البنكي لشهر {period.PeriodMonth}/{period.PeriodYear}",
                CostCenterId: null
            ));
        }

        // 4. Credit GOSI Payable (حصة الموظف + حصة المنشأة للتأمينات)
        var totalGosi = period.TotalEmployeeGosiDeduction + period.TotalCompanyGosiContribution;
        if (totalGosi > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                accruedSalariesAccount.Id,
                Debit: 0m,
                Credit: totalGosi,
                Description: $"مستحقات المؤسسة العامة للتأمينات الاجتماعية لشهر {period.PeriodMonth}/{period.PeriodYear}",
                CostCenterId: null
            ));
        }

        // 5. Credit any remaining deductions (غياب / سلف / جزاءات)
        var otherDeductionsTotal = period.TotalAbsenceDeductions + period.TotalLoanDeductions + period.TotalOtherDeductions;
        if (otherDeductionsTotal > 0)
        {
            lines.Add(new CreateJournalEntryLineRequest(
                accruedSalariesAccount.Id,
                Debit: 0m,
                Credit: otherDeductionsTotal,
                Description: $"استقطاعات الغياب والسلف الأخرى لشهر {period.PeriodMonth}/{period.PeriodYear}",
                CostCenterId: null
            ));
        }

        var entryCommand = new CreateJournalEntryCommand(
            CompanyId: period.CompanyId,
            EntryDate: period.EndDate,
            EntryType: JournalEntryType.Payroll,
            DescriptionAr: $"قيد مسيّر رواتب العاملين لشهر {period.PeriodMonth}/{period.PeriodYear} - {period.PayrollNumber}",
            DescriptionEn: $"Payroll Journal Entry for {period.PeriodMonth}/{period.PeriodYear} - {period.PayrollNumber}",
            ReferenceNumber: period.PayrollNumber,
            PostImmediately: true,
            Lines: lines
        );

        var entryResult = await _mediator.Send(entryCommand, cancellationToken);
        if (!entryResult.IsSuccess)
        {
            return Result.Failure<PayrollPeriodDto>(entryResult.Error);
        }

        var journalEntry = entryResult.Value;
        period.LinkGlJournalEntry(journalEntry.Id, journalEntry.EntryNumber, "SystemAdmin");

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
