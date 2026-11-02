using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing;

public record VatPeriodClosingResultDto(
    Guid JournalEntryId,
    string JournalEntryNumber,
    string PeriodLabel,
    decimal TotalOutputVat,
    decimal TotalInputVat,
    decimal NetVatPayableOrRefundable,
    bool IsRefundable,
    DateTime ClosedAtUtc
);

public record CloseVatPeriodCommand(
    Guid? CompanyId,
    DateTime FromDate,
    DateTime ToDate,
    string? PeriodNameAr = null,
    string? PeriodNameEn = null,
    string? ClosedBy = null
) : IRequest<Result<VatPeriodClosingResultDto>>;

public class CloseVatPeriodCommandHandler : IRequestHandler<CloseVatPeriodCommand, Result<VatPeriodClosingResultDto>>
{
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public CloseVatPeriodCommandHandler(
        IJournalEntryRepository journalRepo,
        IAccountRepository accountRepo,
        IMediator mediator,
        ICurrentTenantContext tenantContext)
    {
        _journalRepo = journalRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
        _tenantContext = tenantContext;
    }

    public async Task<Result<VatPeriodClosingResultDto>> Handle(CloseVatPeriodCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var postedLines = await _journalRepo.GetPostedLinesAsync(companyId, request.FromDate, request.ToDate, null, cancellationToken);

        // Account IDs
        var vatOutputAccs = allAccounts.Where(a => (a.AccountCode == "21201" || a.AccountCode == "212") && a.IsPostable).ToList();
        var vatInputAccs = allAccounts.Where(a => (a.AccountCode == "11401" || a.AccountCode == "11402") && a.IsPostable).ToList();

        var vatOutputIds = vatOutputAccs.Select(a => a.Id).ToHashSet();
        var vatInputIds = vatInputAccs.Select(a => a.Id).ToHashSet();

        // 1. Output VAT balance
        var vatOutputLines = postedLines.Where(l => vatOutputIds.Contains(l.AccountId)).ToList();
        var totalOutputVat = vatOutputLines.Sum(l => l.Credit) - vatOutputLines.Sum(l => l.Debit);
        if (totalOutputVat < 0) totalOutputVat = 0m;

        // 2. Input VAT balance
        var vatInputLines = postedLines.Where(l => vatInputIds.Contains(l.AccountId)).ToList();
        var totalInputVat = vatInputLines.Sum(l => l.Debit) - vatInputLines.Sum(l => l.Credit);
        if (totalInputVat < 0) totalInputVat = 0m;

        if (totalOutputVat <= 0 && totalInputVat <= 0)
        {
            return Result.Failure<VatPeriodClosingResultDto>(new Error(
                "VatClosing.NoVatActivity",
                "لا توجد حركات ضريبة قيمة مضافة مرحلة خلال هذه الفترة تتطلب الإقفال والتسوية."));
        }

        var netVat = totalOutputVat - totalInputVat;
        var isRefundable = netVat < 0;

        var periodLabel = string.IsNullOrWhiteSpace(request.PeriodNameAr)
            ? $"الفترة من {request.FromDate:yyyy/MM/dd} إلى {request.ToDate:yyyy/MM/dd}"
            : request.PeriodNameAr;

        // Output VAT primary account
        var outputVatPrimary = vatOutputAccs.FirstOrDefault(a => a.AccountCode == "21201") ?? vatOutputAccs.First();
        // Input VAT primary account
        var inputVatPrimary = vatInputAccs.FirstOrDefault(a => a.AccountCode == "11401") ?? vatInputAccs.First();

        // Settlement account (ZATCA Liability / Provision: 21401 or 21301)
        var settlementAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "21401" && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode == "21301" && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("214") && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("21") && a.IsPostable);

        if (settlementAcc == null)
        {
            return Result.Failure<VatPeriodClosingResultDto>(new Error(
                "VatClosing.MissingSettlementAccount",
                "تعذر العثور على حساب تسوية مصلحة الزكاة والضريبة (21401/21301) في دليل الحسابات."));
        }

        // Prepare Balanced Closing Journal Entry Lines
        var jvLines = new List<CreateJournalEntryLineRequest>();

        // 1. Debit Output VAT to clear its credit balance
        if (totalOutputVat > 0)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: outputVatPrimary.Id,
                Debit: totalOutputVat,
                Credit: 0m,
                Description: $"إقفال ضريبة المخرجات المستحقة عن {periodLabel}",
                CostCenterId: null));
        }

        // 2. Credit Input VAT to clear its debit balance
        if (totalInputVat > 0)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: inputVatPrimary.Id,
                Debit: 0m,
                Credit: totalInputVat,
                Description: $"إقفال ضريبة المدخلات المستردة عن {periodLabel}",
                CostCenterId: null));
        }

        // 3. Balance difference against Settlement Account
        if (netVat > 0)
        {
            // Payable to ZATCA (Credit Liability)
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: settlementAcc.Id,
                Debit: 0m,
                Credit: netVat,
                Description: $"صافي ضريبة القيمة المضافة المستحقة للسداد لهيئة الزكاة والضريبة (ZATCA) عن {periodLabel}",
                CostCenterId: null));
        }
        else if (netVat < 0)
        {
            // Refundable / Credit with ZATCA (Debit Asset/Reduction)
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: settlementAcc.Id,
                Debit: Math.Abs(netVat),
                Credit: 0m,
                Description: $"صافي رصيد ضريبة القيمة المضافة القابلة للاسترداد / التدوير من هيئة الزكاة (ZATCA) عن {periodLabel}",
                CostCenterId: null));
        }

        var entryDate = request.ToDate <= DateTime.UtcNow ? request.ToDate : DateTime.UtcNow;

        var jvCommand = new CreateJournalEntryCommand(
            CompanyId: companyId,
            EntryDate: entryDate,
            EntryType: JournalEntryType.Closing,
            DescriptionAr: $"قيد إقفال وتسوية ضريبة القيمة المضافة - {periodLabel} (ZATCA Official Closing)",
            DescriptionEn: $"VAT Period Closing & Settlement Entry - {periodLabel}",
            ReferenceNumber: $"VAT-CLS-{entryDate:yyyyMM}",
            PostImmediately: true,
            Lines: jvLines);

        var jvResult = await _mediator.Send(jvCommand, cancellationToken);
        if (jvResult.IsFailure)
        {
            return Result.Failure<VatPeriodClosingResultDto>(jvResult.Error);
        }

        return Result.Success(new VatPeriodClosingResultDto(
            JournalEntryId: jvResult.Value.Id,
            JournalEntryNumber: jvResult.Value.EntryNumber,
            PeriodLabel: periodLabel,
            TotalOutputVat: totalOutputVat,
            TotalInputVat: totalInputVat,
            NetVatPayableOrRefundable: netVat,
            IsRefundable: isRefundable,
            ClosedAtUtc: DateTime.UtcNow
        ));
    }
}
