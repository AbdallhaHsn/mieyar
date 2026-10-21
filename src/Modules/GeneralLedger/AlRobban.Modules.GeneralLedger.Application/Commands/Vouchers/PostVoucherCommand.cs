using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;

public record PostVoucherCommand(Guid VoucherId) : IRequest<Result<VoucherDto>>;

public class PostVoucherCommandHandler : IRequestHandler<PostVoucherCommand, Result<VoucherDto>>
{
    private readonly IVoucherRepository _voucherRepo;
    private readonly IMediator _mediator;

    public PostVoucherCommandHandler(
        IVoucherRepository voucherRepo,
        IMediator mediator)
    {
        _voucherRepo = voucherRepo;
        _mediator = mediator;
    }

    public async Task<Result<VoucherDto>> Handle(PostVoucherCommand request, CancellationToken cancellationToken)
    {
        var voucher = await _voucherRepo.GetByIdAsync(request.VoucherId, cancellationToken);
        if (voucher == null)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.NotFound", "السند المطلوب غير موجود"));
        }

        if (voucher.Status != VoucherStatus.Draft)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.InvalidStatus", $"لا يمكن ترحيل السند لأنه بحالة: {voucher.Status}"));
        }

        if (voucher.Lines.Count == 0 || voucher.Amount <= 0)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.ZeroAmount", "لا يمكن ترحيل سند بدون بنود مالية معتمدة"));
        }

        // Build Journal Entry Lines
        var journalLines = new List<CreateJournalEntryLineRequest>();
        var prefix = voucher.VoucherType == VoucherType.Receipt ? "سند قبض" : "سند صرف";
        var entityDesc = $"{prefix} {voucher.VoucherNumber}: {voucher.Description}";

        if (voucher.VoucherType == VoucherType.Receipt)
        {
            // Debit: Cash/Bank Account (المقبوضات إلى الصندوق/البنك)
            journalLines.Add(new CreateJournalEntryLineRequest(
                voucher.CashOrBankAccountId,
                Debit: voucher.Amount,
                Credit: 0m,
                Description: entityDesc,
                CostCenterId: null));

            // Credit: Lines (الحسابات المقبوض منها / العملاء / الإيرادات)
            foreach (var line in voucher.Lines)
            {
                journalLines.Add(new CreateJournalEntryLineRequest(
                    line.AccountId,
                    Debit: 0m,
                    Credit: line.Amount,
                    Description: string.IsNullOrWhiteSpace(line.Description) ? entityDesc : line.Description,
                    CostCenterId: line.CostCenterId));
            }
        }
        else // Payment Voucher
        {
            // Debit: Lines (الحسابات المدفوع لها / الموردين / المصروفات)
            foreach (var line in voucher.Lines)
            {
                journalLines.Add(new CreateJournalEntryLineRequest(
                    line.AccountId,
                    Debit: line.Amount,
                    Credit: 0m,
                    Description: string.IsNullOrWhiteSpace(line.Description) ? entityDesc : line.Description,
                    CostCenterId: line.CostCenterId));
            }

            // Credit: Cash/Bank Account (المدفوعات من الصندوق/البنك)
            journalLines.Add(new CreateJournalEntryLineRequest(
                voucher.CashOrBankAccountId,
                Debit: 0m,
                Credit: voucher.Amount,
                Description: entityDesc,
                CostCenterId: null));
        }

        // Create and post Journal Entry
        var createEntryCmd = new CreateJournalEntryCommand(
            voucher.CompanyId,
            voucher.VoucherDate,
            JournalEntryType.Daily,
            DescriptionAr: entityDesc,
            DescriptionEn: $"{voucher.VoucherType} Voucher {voucher.VoucherNumber}",
            ReferenceNumber: voucher.VoucherNumber,
            PostImmediately: true,
            Lines: journalLines);

        var entryResult = await _mediator.Send(createEntryCmd, cancellationToken);
        if (!entryResult.IsSuccess)
        {
            return Result.Failure<VoucherDto>(entryResult.Error);
        }

        // Mark voucher as posted
        voucher.Post(entryResult.Value.Id, "Admin / Accountant");
        await _voucherRepo.SaveChangesAsync(cancellationToken);

        var updatedVoucher = await _voucherRepo.GetByIdAsync(voucher.Id, cancellationToken);
        return Result.Success(CreateVoucherCommandHandler.MapToDto(updatedVoucher!));
    }
}
