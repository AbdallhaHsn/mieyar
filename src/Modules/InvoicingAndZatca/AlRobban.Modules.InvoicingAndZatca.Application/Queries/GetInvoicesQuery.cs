using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.Commands;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
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
    private readonly ISalespersonRepository _salespersonRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetInvoicesQueryHandler(
        IInvoiceRepository invoiceRepo,
        ISalespersonRepository salespersonRepo,
        ICurrentTenantContext tenantContext)
    {
        _invoiceRepo = invoiceRepo;
        _salespersonRepo = salespersonRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<InvoiceDto>>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var invoices = await _invoiceRepo.GetListAsync(
            companyId,
            request.InvoiceType,
            request.TransactionType,
            request.Status,
            request.FromDate,
            request.ToDate,
            request.SearchTerm,
            cancellationToken);

        // Salesperson & Warehouse Isolation: Limit visibility if request is from a salesperson user
        if (Guid.TryParse(_tenantContext.UserId, out var uid))
        {
            var userSp = await _salespersonRepo.GetByUserIdAsync(companyId, uid, cancellationToken);
            if (userSp != null)
            {
                invoices = invoices.Where(i => 
                    i.SalespersonId == userSp.Id || 
                    (!string.IsNullOrEmpty(userSp.WarehouseCode) && i.WarehouseCode == userSp.WarehouseCode) ||
                    i.CreatedBy == _tenantContext.UserName ||
                    i.CreatedBy == _tenantContext.UserDisplayName).ToList();
            }
        }

        // Calculate returned amounts from Credit Notes across the company
        var allCompanyInvoices = await _invoiceRepo.GetListAsync(
            companyId,
            null,
            null,
            null,
            null,
            null,
            null,
            cancellationToken);

        var creditNotes = allCompanyInvoices
            .Where(cn => (cn.TransactionType == TransactionType.CreditNote || cn.InvoiceNumber.StartsWith("CN-")) && cn.Status != InvoiceStatus.Cancelled)
            .ToList();

        var dtos = invoices.Select(inv => {
            var returnedAmount = creditNotes
                .Where(cn => (cn.ReferenceInvoiceId.HasValue && cn.ReferenceInvoiceId.Value == inv.Id) ||
                             (!string.IsNullOrEmpty(cn.ReferenceInvoiceNumber) && string.Equals(cn.ReferenceInvoiceNumber, inv.InvoiceNumber, StringComparison.OrdinalIgnoreCase)))
                .DistinctBy(cn => cn.Id)
                .Sum(cn => cn.TotalAmount);

            return CreateInvoiceCommandHandler.MapToDto(inv, returnedAmount);
        }).ToList();

        return Result.Success(dtos);
    }
}

public record GetInvoiceByIdQuery(Guid Id) : IRequest<Result<InvoiceDto>>;

public class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IBusinessPartnerRepository? _partnerRepo;

    public GetInvoiceByIdQueryHandler(IInvoiceRepository invoiceRepo, IBusinessPartnerRepository? partnerRepo = null)
    {
        _invoiceRepo = invoiceRepo;
        _partnerRepo = partnerRepo;
    }

    public async Task<Result<InvoiceDto>> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.Id, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.NotFound", "الفاتورة المطلوبة غير موجودة"));
        }

        BusinessPartner? partner = null;
        if (_partnerRepo != null)
        {
            if (invoice.CustomerId.HasValue)
            {
                partner = await _partnerRepo.GetByIdAsync(invoice.CustomerId.Value, cancellationToken);
            }
            else if (!string.IsNullOrWhiteSpace(invoice.CustomerName) && !invoice.CustomerName.Contains("نقدي"))
            {
                var pList = await _partnerRepo.GetListAsync(invoice.CompanyId, null, invoice.CustomerName, cancellationToken);
                partner = pList.FirstOrDefault(p => string.Equals(p.NameAr, invoice.CustomerName, StringComparison.OrdinalIgnoreCase) ||
                                                    string.Equals(p.NameEn, invoice.CustomerName, StringComparison.OrdinalIgnoreCase));
            }
        }

        var allCompanyInvoices = await _invoiceRepo.GetListAsync(
            invoice.CompanyId,
            null,
            null,
            null,
            null,
            null,
            null,
            cancellationToken);

        var returnedAmount = allCompanyInvoices
            .Where(cn => (cn.TransactionType == TransactionType.CreditNote || cn.InvoiceNumber.StartsWith("CN-")) && cn.Status != InvoiceStatus.Cancelled)
            .Where(cn => (cn.ReferenceInvoiceId.HasValue && cn.ReferenceInvoiceId.Value == invoice.Id) || (!string.IsNullOrEmpty(cn.ReferenceInvoiceNumber) && string.Equals(cn.ReferenceInvoiceNumber, invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase)))
            .DistinctBy(cn => cn.Id)
            .Sum(cn => cn.TotalAmount);

        return Result.Success(CreateInvoiceCommandHandler.MapToDto(invoice, returnedAmount, partner));
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
