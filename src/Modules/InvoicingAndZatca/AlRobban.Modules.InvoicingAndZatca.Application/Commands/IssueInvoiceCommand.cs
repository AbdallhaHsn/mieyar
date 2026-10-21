using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands;

public record IssueInvoiceCommand(Guid InvoiceId, string IssuedBy = "System") : IRequest<Result<IssueInvoiceResultDto>>;

public class IssueInvoiceCommandHandler : IRequestHandler<IssueInvoiceCommand, Result<IssueInvoiceResultDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IInvoiceCryptoService _cryptoService;

    public IssueInvoiceCommandHandler(
        IInvoiceRepository invoiceRepo,
        IInvoiceCryptoService cryptoService)
    {
        _invoiceRepo = invoiceRepo;
        _cryptoService = cryptoService;
    }

    public async Task<Result<IssueInvoiceResultDto>> Handle(IssueInvoiceCommand command, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(command.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<IssueInvoiceResultDto>(new Error("Invoice.NotFound", "الفاتورة المطلوبة غير موجودة"));
        }

        if (invoice.Status != InvoiceStatus.Draft)
        {
            return Result.Failure<IssueInvoiceResultDto>(new Error("Invoice.AlreadyIssued", "هذه الفاتورة تم إصدارها واعتمادها مسبقاً"));
        }

        // Generate Canonical XML & Compute SHA-256
        var sellerName = "شركة الربان للحلول والأنظمة المحاسبية";
        var sellerVat = "300000000000003";

        var xmlContent = _cryptoService.GenerateInvoiceXml(invoice, sellerName, sellerVat);
        var invoiceHash = _cryptoService.ComputeSha256Hash(xmlContent);

        // Standard dummy/ECDSA Cryptographic Stamp for preview & simulation
        var stamp = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"ECDSA-SIGNATURE-{invoice.InvoiceNumber}-{invoiceHash[..10]}"));

        // Generate ZATCA Phase 2 TLV QR Code
        var qrCodePayload = _cryptoService.GenerateZatcaQrCode(
            sellerName,
            sellerVat,
            invoice.IssueDate.Add(invoice.IssueTime),
            invoice.TotalAmount,
            invoice.TotalVat,
            invoiceHash);

        // Sign & Finalize Invoice
        invoice.SignAndFinalize(invoiceHash, stamp, qrCodePayload, command.IssuedBy);

        // Automatically set status based on Type
        if (invoice.InvoiceType == InvoiceType.Standard)
        {
            invoice.UpdateZatcaStatus(InvoiceStatus.Cleared);
        }
        else
        {
            invoice.UpdateZatcaStatus(InvoiceStatus.Reported);
        }

        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        var message = $"تم اعتماد وإصدار الفاتورة رقم [{invoice.InvoiceNumber}] بنجاح وتوليد الختم الرقمي وكود الاستجابة السريعة (ZATCA Phase 2 QR).";

        return Result.Success(new IssueInvoiceResultDto(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.Status,
            invoiceHash,
            qrCodePayload,
            invoice.AssociatedJournalEntryId,
            invoice.AssociatedJournalEntryNumber,
            message));
    }
}
