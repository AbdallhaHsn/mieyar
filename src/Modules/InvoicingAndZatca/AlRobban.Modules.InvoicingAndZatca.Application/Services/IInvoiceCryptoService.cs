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

    string GeneratePhase2QrCode(
        string sellerName,
        string sellerVat,
        DateTime timestamp,
        decimal totalAmount,
        decimal vatAmount,
        string invoiceHash,
        string? privateKeyPem = null,
        string? publicKeyPem = null);

    string SignHash(string hashBase64, string privateKeyPem);

    string GenerateInvoiceXml(
        Domain.Entities.Invoice invoice, 
        string sellerName, 
        string sellerVat,
        string? digitalSignature = null,
        string? certificateBase64 = null);
}
