using AlRobban.Modules.InvoicingAndZatca.Application.Commands;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Queries;

public record GetInvoicesQuery(
    Guid? CompanyId,
    InvoiceType? InvoiceType = null,
    TransactionType? TransactionType = null,
    InvoiceStatus? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SearchTerm = null) : IRequest<Result<List<InvoiceDto>>>;

public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, Result<List<InvoiceDto>>>
{
    private readonly IInvoiceRepository _invoiceRepo;

    public GetInvoicesQueryHandler(IInvoiceRepository invoiceRepo)
    {
        _invoiceRepo = invoiceRepo;
    }

    public async Task<Result<List<InvoiceDto>>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var invoices = await _invoiceRepo.GetListAsync(
            companyId,
            request.InvoiceType,
            request.TransactionType,
            request.Status,
            request.FromDate,
            request.ToDate,
            request.SearchTerm,
            cancellationToken);

        var dtos = invoices.Select(CreateInvoiceCommandHandler.MapToDto).ToList();
        return Result.Success(dtos);
    }
}

public record GetInvoiceByIdQuery(Guid Id) : IRequest<Result<InvoiceDto>>;

public class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;

    public GetInvoiceByIdQueryHandler(IInvoiceRepository invoiceRepo)
    {
        _invoiceRepo = invoiceRepo;
    }

    public async Task<Result<InvoiceDto>> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.Id, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.NotFound", "الفاتورة المطلوبة غير موجودة"));
        }

        return Result.Success(CreateInvoiceCommandHandler.MapToDto(invoice));
    }
}

public record GetInvoiceKpisQuery(Guid? CompanyId) : IRequest<Result<InvoiceKpisDto>>;

public class GetInvoiceKpisQueryHandler : IRequestHandler<GetInvoiceKpisQuery, Result<InvoiceKpisDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;

    public GetInvoiceKpisQueryHandler(IInvoiceRepository invoiceRepo)
    {
        _invoiceRepo = invoiceRepo;
    }

    public async Task<Result<InvoiceKpisDto>> Handle(GetInvoiceKpisQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var invoices = await _invoiceRepo.GetListAsync(companyId, cancellationToken: cancellationToken);

        var total = invoices.Count;
        var standard = invoices.Count(i => i.InvoiceType == InvoiceType.Standard);
        var simplified = invoices.Count(i => i.InvoiceType == InvoiceType.Simplified);
        var issued = invoices.Count(i => i.Status != InvoiceStatus.Draft);
        var draft = invoices.Count(i => i.Status == InvoiceStatus.Draft);

        var taxableSales = invoices.Where(i => i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft)
            .Sum(i => i.TransactionType == TransactionType.CreditNote ? -i.TotalTaxableAmount : i.TotalTaxableAmount);

        var vatCollected = invoices.Where(i => i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft)
            .Sum(i => i.TransactionType == TransactionType.CreditNote ? -i.TotalVat : i.TotalVat);

        var grossSales = invoices.Where(i => i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft)
            .Sum(i => i.TransactionType == TransactionType.CreditNote ? -i.TotalAmount : i.TotalAmount);

        return Result.Success(new InvoiceKpisDto(
            total,
            standard,
            simplified,
            issued,
            draft,
            taxableSales,
            vatCollected,
            grossSales));
    }
}
