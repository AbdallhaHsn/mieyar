using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands;

public record CreateInvoiceCommand(CreateInvoiceRequest Request) : IRequest<Result<InvoiceDto>>;

public class CreateInvoiceCommandHandler : IRequestHandler<CreateInvoiceCommand, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IMediator _mediator;

    public CreateInvoiceCommandHandler(
        IInvoiceRepository invoiceRepo,
        IMediator mediator)
    {
        _invoiceRepo = invoiceRepo;
        _mediator = mediator;
    }

    public async Task<Result<InvoiceDto>> Handle(CreateInvoiceCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.CustomerName))
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.CustomerNameRequired", "اسم العميل / المشتري إلزامي"));
        }

        if (req.Lines == null || req.Lines.Count == 0)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.LinesRequired", "يجب إضافة بند واحد على الأقل في الفاتورة"));
        }

        var companyId = req.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = companyId;
        var year = req.IssueDate.Year;

        // Generate next sequence number
        var invoiceNumber = await _invoiceRepo.GenerateNextNumberAsync(companyId, req.TransactionType, year, cancellationToken);
        var lastPih = await _invoiceRepo.GetLastInvoiceHashAsync(companyId, cancellationToken);

        var customerAddress = req.CustomerAddress;
        if (string.IsNullOrWhiteSpace(customerAddress) && !string.IsNullOrWhiteSpace(req.BuyerStreet))
        {
            customerAddress = $"مبنى {req.BuyerBuildingNumber}، {req.BuyerStreet}، {req.BuyerDistrict}، {req.BuyerCity} {req.BuyerPostalCode}، {req.BuyerCountryCode}".Trim('،', ' ');
        }

        var crNumber = !string.IsNullOrWhiteSpace(req.CustomerCrNumber) ? req.CustomerCrNumber : req.BuyerOtherIdValue;

        var invoice = Invoice.Create(
            tenantId,
            companyId,
            invoiceNumber,
            req.IssueDate,
            req.InvoiceType,
            req.TransactionType,
            req.CustomerName,
            req.CustomerVatNumber,
            crNumber,
            customerAddress,
            lastPih,
            req.ReferenceInvoiceId,
            req.ReferenceInvoiceNumber,
            req.ModificationReason,
            "User");

        foreach (var line in req.Lines)
        {
            invoice.AddLine(
                line.ItemNameAr,
                line.ItemNameEn,
                line.Quantity,
                line.UnitPrice,
                line.Discount,
                line.VatRate);
        }

        invoice.RecalculateTotals();
        await _invoiceRepo.AddAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        // If AutoIssueAndPost requested, trigger Issue command
        if (req.AutoIssueAndPost)
        {
            var issueResult = await _mediator.Send(new IssueInvoiceCommand(invoice.Id), cancellationToken);
            if (issueResult.IsSuccess)
            {
                // Reload updated invoice
                var refreshed = await _invoiceRepo.GetByIdAsync(invoice.Id, cancellationToken);
                if (refreshed != null)
                {
                    return Result.Success(MapToDto(refreshed));
                }
            }
        }

        return Result.Success(MapToDto(invoice));
    }

    public static InvoiceDto MapToDto(Invoice inv)
    {
        var typeNameAr = inv.InvoiceType switch
        {
            InvoiceType.Standard => "فاتورة ضريبية (B2B)",
            InvoiceType.Simplified => "فاتورة مبسطة (B2C)",
            _ => "فاتورة"
        };

        var transTypeNameAr = inv.TransactionType switch
        {
            TransactionType.Invoice => "فاتورة مبيعات",
            TransactionType.CreditNote => "إشعار دائن (مرتجع)",
            TransactionType.DebitNote => "إشعار مدين",
            _ => "فاتورة"
        };

        var statusNameAr = inv.Status switch
        {
            InvoiceStatus.Draft => "مسودة",
            InvoiceStatus.Issued => "معتمدة ومصدرة",
            InvoiceStatus.Cleared => "مقبولة ومعتمدة زكاة",
            InvoiceStatus.Reported => "مبلّغة لدى هيئة زكاة",
            InvoiceStatus.Rejected => "مرفوضة",
            InvoiceStatus.Cancelled => "ملغاة",
            _ => "مسودة"
        };

        var lines = inv.Lines.Select(l => new InvoiceLineDto(
            l.Id,
            l.LineNumber,
            l.ItemNameAr,
            l.ItemNameEn,
            l.Quantity,
            l.UnitPrice,
            l.SubTotal,
            l.Discount,
            l.TaxableAmount,
            l.VatRate,
            l.VatAmount,
            l.TotalAmount)).ToList();

        return new InvoiceDto(
            inv.Id,
            inv.InvoiceNumber,
            inv.Uuid,
            inv.IssueDate,
            inv.IssueTime,
            inv.InvoiceType,
            typeNameAr,
            inv.TransactionType,
            transTypeNameAr,
            inv.Status,
            statusNameAr,
            inv.Currency,
            inv.CustomerName,
            inv.CustomerVatNumber,
            inv.CustomerCrNumber,
            inv.CustomerAddress,
            inv.ReferenceInvoiceId,
            inv.ReferenceInvoiceNumber,
            inv.ModificationReason,
            inv.SubTotal,
            inv.TotalDiscount,
            inv.TotalTaxableAmount,
            inv.TotalVat,
            inv.TotalAmount,
            inv.PreviousInvoiceHash,
            inv.InvoiceHash,
            inv.CryptographicStamp,
            inv.QrCodePayload,
            inv.AssociatedJournalEntryId,
            inv.AssociatedJournalEntryNumber,
            inv.CreatedAtUtc,
            lines);
    }
}
