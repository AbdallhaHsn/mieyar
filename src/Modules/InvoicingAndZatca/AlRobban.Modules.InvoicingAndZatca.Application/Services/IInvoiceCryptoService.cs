namespace AlRobban.Modules.InvoicingAndZatca.Application.Services;

public interface IInvoiceCryptoService
{
    string ComputeSha256Hash(string content);
    string GenerateZatcaQrCode(
        string sellerName,
        string sellerVat,
        DateTime timestamp,
        decimal totalAmount,
        decimal vatAmount,
        string invoiceHash);
    string GenerateInvoiceXml(Domain.Entities.Invoice invoice, string sellerName, string sellerVat);
}
