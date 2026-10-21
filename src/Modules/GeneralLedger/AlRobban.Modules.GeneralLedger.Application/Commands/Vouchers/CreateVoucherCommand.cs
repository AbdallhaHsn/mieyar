using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;

public record CreateVoucherCommand(
    Guid CompanyId,
    VoucherType Type,
    DateTime VoucherDate,
    PaymentMethod PaymentMethod,
    Guid CashOrBankAccountId,
    string BeneficiaryOrPayerName,
    string Description,
    string? ReferenceNumber,
    Guid? FiscalPeriodId,
    List<CreateVoucherLineRequest> Lines,
    bool AutoPost = false) : IRequest<Result<VoucherDto>>;

public class CreateVoucherCommandHandler : IRequestHandler<CreateVoucherCommand, Result<VoucherDto>>
{
    private readonly IVoucherRepository _voucherRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IMediator _mediator;

    public CreateVoucherCommandHandler(
        IVoucherRepository voucherRepo,
        IAccountRepository accountRepo,
        IFinancialSettingsRepository settingsRepo,
        ICurrentTenantContext tenantContext,
        IMediator mediator)
    {
        _voucherRepo = voucherRepo;
        _accountRepo = accountRepo;
        _settingsRepo = settingsRepo;
        _tenantContext = tenantContext;
        _mediator = mediator;
    }

    public async Task<Result<VoucherDto>> Handle(CreateVoucherCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-2222-3333-4444-555555555555");

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.EmptyDescription", "بيان السند إلزامي"));
        }

        if (string.IsNullOrWhiteSpace(request.BeneficiaryOrPayerName))
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.EmptyBeneficiary", "اسم المستلم منه / المصروف له إلزامي"));
        }

        if (request.Lines == null || request.Lines.Count == 0)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.EmptyLines", "يجب إضافة بند واحد على الأقل في السند"));
        }

        // Verify cash/bank account exists
        var cashAccount = await _accountRepo.GetByIdAsync(request.CashOrBankAccountId, cancellationToken);
        if (cashAccount == null)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.InvalidCashAccount", "حساب الخزينة / البنك المحدد غير موجود في شجرة الحسابات"));
        }

        // Resolve Fiscal Period
        Guid periodId = request.FiscalPeriodId ?? Guid.Empty;
        if (periodId == Guid.Empty)
        {
            var fiscalYears = await _settingsRepo.GetAllFiscalYearsAsync(companyId, cancellationToken);
            var entryDate = request.VoucherDate.Date;
            var activeYear = fiscalYears.FirstOrDefault(y => y.StartDate.Date <= entryDate && entryDate <= y.EndDate.Date && y.IsActive);
            if (activeYear != null)
            {
                var period = activeYear.Periods.FirstOrDefault(p => p.StartDate <= entryDate && entryDate <= p.EndDate && !p.IsClosingPeriod)
                             ?? activeYear.Periods.FirstOrDefault(p => p.StartDate <= entryDate && entryDate <= p.EndDate);
                if (period != null)
                {
                    periodId = period.Id;
                }
            }
        }

        // Generate voucher sequential number
        var voucherNumber = await _voucherRepo.GenerateNextVoucherNumberAsync(
            companyId,
            request.Type,
            request.VoucherDate.Year,
            cancellationToken);

        var voucher = Voucher.Create(
            tenantId,
            companyId,
            request.Type,
            voucherNumber,
            request.VoucherDate,
            periodId,
            request.PaymentMethod,
            request.CashOrBankAccountId,
            request.BeneficiaryOrPayerName,
            request.Description,
            request.ReferenceNumber,
            "System / Admin");

        foreach (var line in request.Lines)
        {
            if (line.Amount <= 0)
            {
                return Result.Failure<VoucherDto>(new Error("Voucher.InvalidLineAmount", "مبلغ كل بند يجب أن يكون أكبر من صفر"));
            }

            var lineAccount = await _accountRepo.GetByIdAsync(line.AccountId, cancellationToken);
            if (lineAccount == null)
            {
                return Result.Failure<VoucherDto>(new Error("Voucher.InvalidLineAccount", $"الحساب المحدد للبند غير موجود (معرف: {line.AccountId})"));
            }

            voucher.AddLine(line.AccountId, line.Amount, line.Description, line.CostCenterId);
        }

        await _voucherRepo.AddAsync(voucher, cancellationToken);
        await _voucherRepo.SaveChangesAsync(cancellationToken);

        // Auto post if requested
        if (request.AutoPost)
        {
            var postResult = await _mediator.Send(new PostVoucherCommand(voucher.Id), cancellationToken);
            if (postResult.IsSuccess)
            {
                return postResult;
            }
        }

        var savedVoucher = await _voucherRepo.GetByIdAsync(voucher.Id, cancellationToken);
        return Result.Success(MapToDto(savedVoucher!));
    }

    public static VoucherDto MapToDto(Voucher v)
    {
        var typeAr = v.VoucherType == VoucherType.Receipt ? "سند قبض" : "سند صرف";
        var methodAr = v.PaymentMethod switch
        {
            PaymentMethod.Cash => "نقداً",
            PaymentMethod.BankTransfer => "تحويل بنكي",
            PaymentMethod.Cheque => "شيك مصرفي",
            PaymentMethod.Card => "شبكة / بطاقة",
            _ => "أخرى"
        };
        var statusAr = v.Status switch
        {
            VoucherStatus.Draft => "مسودة",
            VoucherStatus.Posted => "مرحل",
            VoucherStatus.Cancelled => "ملغي",
            _ => ""
        };

        var tafqeet = ArabicCurrencyTafqeet.Convert(v.Amount);

        var lines = v.Lines.Select(l => new VoucherLineDto(
            l.Id,
            l.LineNumber,
            l.AccountId,
            l.Account?.AccountCode ?? "",
            l.Account?.NameAr ?? "",
            l.Account?.NameEn ?? "",
            l.CostCenterId,
            l.CostCenter?.NameAr,
            l.Amount,
            l.Description)).ToList();

        return new VoucherDto(
            v.Id,
            v.CompanyId,
            v.VoucherType,
            typeAr,
            v.VoucherType.ToString(),
            v.VoucherNumber,
            v.VoucherDate,
            v.FiscalPeriodId,
            "",
            v.PaymentMethod,
            methodAr,
            v.ReferenceNumber,
            v.CashOrBankAccountId,
            v.CashOrBankAccount?.AccountCode ?? "",
            v.CashOrBankAccount?.NameAr ?? "",
            v.BeneficiaryOrPayerName,
            v.Description,
            v.Amount,
            tafqeet,
            v.JournalEntryId,
            v.JournalEntry?.EntryNumber,
            v.Status,
            statusAr,
            v.Lines.Count,
            v.PostedAtUtc,
            v.PostedBy,
            v.CancelledAtUtc,
            v.CancelledBy,
            v.CancellationReason,
            lines);
    }
}
