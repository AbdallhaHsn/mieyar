using AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.Vouchers;

public record GetVouchersQuery(
    Guid? CompanyId = null,
    VoucherType? Type = null,
    VoucherStatus? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SearchTerm = null) : IRequest<Result<VoucherListResponse>>;

public class GetVouchersQueryHandler : IRequestHandler<GetVouchersQuery, Result<VoucherListResponse>>
{
    private readonly IVoucherRepository _voucherRepo;

    public GetVouchersQueryHandler(IVoucherRepository voucherRepo)
    {
        _voucherRepo = voucherRepo;
    }

    public async Task<Result<VoucherListResponse>> Handle(GetVouchersQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var allCompanyVouchers = await _voucherRepo.GetByCompanyAsync(
            companyId,
            cancellationToken: cancellationToken);

        // Filtered list
        var filtered = allCompanyVouchers.AsEnumerable();

        if (request.Type.HasValue)
        {
            filtered = filtered.Where(v => v.VoucherType == request.Type.Value);
        }

        if (request.Status.HasValue)
        {
            filtered = filtered.Where(v => v.Status == request.Status.Value);
        }

        if (request.FromDate.HasValue)
        {
            filtered = filtered.Where(v => v.VoucherDate >= request.FromDate.Value.Date);
        }

        if (request.ToDate.HasValue)
        {
            var endOfDay = request.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            filtered = filtered.Where(v => v.VoucherDate <= endOfDay);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            filtered = filtered.Where(v =>
                v.VoucherNumber.ToLower().Contains(term) ||
                v.Description.ToLower().Contains(term) ||
                (!string.IsNullOrEmpty(v.BeneficiaryOrPayerName) && v.BeneficiaryOrPayerName.ToLower().Contains(term)) ||
                (!string.IsNullOrEmpty(v.ReferenceNumber) && v.ReferenceNumber.ToLower().Contains(term)));
        }

        var voucherList = filtered.ToList();

        // Calculate KPIs across all vouchers
        var totalReceipts = allCompanyVouchers
            .Where(v => v.VoucherType == VoucherType.Receipt && v.Status == VoucherStatus.Posted)
            .Sum(v => v.Amount);

        var totalPayments = allCompanyVouchers
            .Where(v => v.VoucherType == VoucherType.Payment && v.Status == VoucherStatus.Posted)
            .Sum(v => v.Amount);

        var kpis = new VoucherKpisDto(
            TotalVouchers: allCompanyVouchers.Count,
            ReceiptCount: allCompanyVouchers.Count(v => v.VoucherType == VoucherType.Receipt),
            PaymentCount: allCompanyVouchers.Count(v => v.VoucherType == VoucherType.Payment),
            PostedCount: allCompanyVouchers.Count(v => v.Status == VoucherStatus.Posted),
            DraftCount: allCompanyVouchers.Count(v => v.Status == VoucherStatus.Draft),
            TotalReceiptsAmount: totalReceipts,
            TotalPaymentsAmount: totalPayments,
            NetCashFlow: totalReceipts - totalPayments);

        var items = voucherList.Select(CreateVoucherCommandHandler.MapToDto).ToList();

        return Result.Success(new VoucherListResponse(items, kpis));
    }
}

public record GetVoucherByIdQuery(Guid Id) : IRequest<Result<VoucherDto>>;

public class GetVoucherByIdQueryHandler : IRequestHandler<GetVoucherByIdQuery, Result<VoucherDto>>
{
    private readonly IVoucherRepository _voucherRepo;

    public GetVoucherByIdQueryHandler(IVoucherRepository voucherRepo)
    {
        _voucherRepo = voucherRepo;
    }

    public async Task<Result<VoucherDto>> Handle(GetVoucherByIdQuery request, CancellationToken cancellationToken)
    {
        var voucher = await _voucherRepo.GetByIdAsync(request.Id, cancellationToken);
        if (voucher == null)
        {
            return Result.Failure<VoucherDto>(new Error("Voucher.NotFound", "السند المطلوب غير موجود"));
        }

        return Result.Success(CreateVoucherCommandHandler.MapToDto(voucher));
    }
}
