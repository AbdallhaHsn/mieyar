using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;

public record CancelVoucherCommand(Guid VoucherId, string Reason) : IRequest<Result<VoucherDto>>;

public class CancelVoucherCommandHandler : IRequestHandler<CancelVoucherCommand, Result<VoucherDto>>
{
    private readonly IVoucherRepository _voucherRepo;
    private readonly IMediator _mediator;

    public CancelVoucherCommandHandler(
        IVoucherRepository voucherRepo,
        IMediator mediator)
    {
        _voucherRepo = voucherRepo;
        _mediator = mediator;
    }

    public async Task<Result<VoucherDto>> Handle(CancelVoucherCommand request, CancellationToken cancellationToken)
    {
        var voucher = await _voucherRepo.GetByIdAsync(request.VoucherId, cancellationToken);
        if (voucher == null)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.NotFound", "السند المطلوب غير موجود"));
        }

        if (voucher.Status != VoucherStatus.Posted)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.InvalidStatusForCancel", "لا يمكن إلغاء إلا السندات المرحلة فقط"));
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.EmptyReason", "يجب ذكر سبب إلغاء السند"));
        }

        // Reverse linked Journal Entry if present
        if (voucher.JournalEntryId.HasValue)
        {
            var reverseResult = await _mediator.Send(
                new ReverseJournalEntryCommand(voucher.JournalEntryId.Value, $"إلغاء السند {voucher.VoucherNumber}: {request.Reason}", "System / Admin"),
                cancellationToken);

            if (!reverseResult.IsSuccess)
            {
                return Result.Failure<VoucherDto>(reverseResult.Error);
            }
        }

        voucher.Cancel("System / Admin", request.Reason);
        await _voucherRepo.SaveChangesAsync(cancellationToken);

        var updatedVoucher = await _voucherRepo.GetByIdAsync(voucher.Id, cancellationToken);
        return Result.Success(CreateVoucherCommandHandler.MapToDto(updatedVoucher!));
    }
}
