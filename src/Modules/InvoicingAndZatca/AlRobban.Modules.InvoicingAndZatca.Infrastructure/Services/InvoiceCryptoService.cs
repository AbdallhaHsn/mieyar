using System.Security.Cryptography;
using System.Text;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Services;

public class InvoiceCryptoService : IInvoiceCryptoService
{
    public string ComputeSha256Hash(string content)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(content);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public string GenerateZatcaQrCode(
        string sellerName,
        string sellerVat,
        DateTime timestamp,
        decimal totalAmount,
        decimal vatAmount,
        string invoiceHash)
    {
        var tlvs = new List<byte>();

        // Tag 1: Seller's Name
        AddTlvTag(tlvs, 1, Encoding.UTF8.GetBytes(sellerName));

        // Tag 2: VAT Registration Number
        AddTlvTag(tlvs, 2, Encoding.UTF8.GetBytes(sellerVat));

        // Tag 3: Time stamp (ISO 8601 UTC)
        var timeStr = timestamp.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
        AddTlvTag(tlvs, 3, Encoding.UTF8.GetBytes(timeStr));

        // Tag 4: Invoice Total Amount
        var totalStr = totalAmount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        AddTlvTag(tlvs, 4, Encoding.UTF8.GetBytes(totalStr));

        // Tag 5: VAT Total Amount
        var vatStr = vatAmount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        AddTlvTag(tlvs, 5, Encoding.UTF8.GetBytes(vatStr));

        // Tag 6: Invoice SHA-256 Hash
        AddTlvTag(tlvs, 6, Encoding.UTF8.GetBytes(invoiceHash));

        return Convert.ToBase64String(tlvs.ToArray());
    }

    public string GenerateInvoiceXml(Invoice invoice, string sellerName, string sellerVat)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"");
        sb.AppendLine("         xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"");
        sb.AppendLine("         xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">");
        sb.AppendLine($"    <cbc:ID>{invoice.InvoiceNumber}</cbc:ID>");
        sb.AppendLine($"    <cbc:UUID>{invoice.Uuid}</cbc:UUID>");
        sb.AppendLine($"    <cbc:IssueDate>{invoice.IssueDate:yyyy-MM-dd}</cbc:IssueDate>");
        sb.AppendLine($"    <cbc:IssueTime>{invoice.IssueTime:hh\\:mm\\:ss}</cbc:IssueTime>");
        sb.AppendLine($"    <cbc:InvoiceTypeCode name=\"{(int)invoice.InvoiceType}\">{(invoice.InvoiceType == Domain.Enums.InvoiceType.Standard ? "388" : "381")}</cbc:InvoiceTypeCode>");
        sb.AppendLine($"    <cbc:DocumentCurrencyCode>{invoice.Currency}</cbc:DocumentCurrencyCode>");

        // Seller (Supplier)
        sb.AppendLine("    <cac:AccountingSupplierParty>");
        sb.AppendLine("        <cac:Party>");
        sb.AppendLine("            <cac:PartyIdentification>");
        sb.AppendLine("                <cbc:ID schemeID=\"CRN\">1010789456</cbc:ID>");
        sb.AppendLine("            </cac:PartyIdentification>");
        sb.AppendLine("            <cac:PostalAddress>");
        sb.AppendLine("                <cbc:StreetName>طريق الملك فهد</cbc:StreetName>");
        sb.AppendLine("                <cbc:BuildingNumber>7254</cbc:BuildingNumber>");
        sb.AppendLine("                <cbc:CitySubdivisionName>حي العليا</cbc:CitySubdivisionName>");
        sb.AppendLine("                <cbc:CityName>الرياض</cbc:CityName>");
        sb.AppendLine("                <cbc:PostalZone>12214</cbc:PostalZone>");
        sb.AppendLine("                <cac:Country>");
        sb.AppendLine("                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>");
        sb.AppendLine("                </cac:Country>");
        sb.AppendLine("            </cac:PostalAddress>");
        sb.AppendLine("            <cac:PartyTaxScheme>");
        sb.AppendLine($"                <cbc:CompanyID>{sellerVat}</cbc:CompanyID>");
        sb.AppendLine("                <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>");
        sb.AppendLine("            </cac:PartyTaxScheme>");
        sb.AppendLine("            <cac:PartyLegalEntity>");
        sb.AppendLine($"                <cbc:RegistrationName>{sellerName}</cbc:RegistrationName>");
        sb.AppendLine("            </cac:PartyLegalEntity>");
        sb.AppendLine("        </cac:Party>");
        sb.AppendLine("    </cac:AccountingSupplierParty>");

        // Buyer (Customer)
        sb.AppendLine("    <cac:AccountingCustomerParty>");
        sb.AppendLine("        <cac:Party>");
        if (!string.IsNullOrWhiteSpace(invoice.CustomerCrNumber))
        {
            sb.AppendLine("            <cac:PartyIdentification>");
            sb.AppendLine($"                <cbc:ID schemeID=\"CRN\">{invoice.CustomerCrNumber}</cbc:ID>");
            sb.AppendLine("            </cac:PartyIdentification>");
        }
        if (!string.IsNullOrWhiteSpace(invoice.CustomerAddress))
        {
            sb.AppendLine("            <cac:PostalAddress>");
            sb.AppendLine($"                <cbc:StreetName>{invoice.CustomerAddress}</cbc:StreetName>");
            sb.AppendLine("                <cac:Country>");
            sb.AppendLine("                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>");
            sb.AppendLine("                </cac:Country>");
            sb.AppendLine("            </cac:PostalAddress>");
        }
        sb.AppendLine("            <cac:PartyTaxScheme>");
        if (!string.IsNullOrWhiteSpace(invoice.CustomerVatNumber))
        {
            sb.AppendLine($"                <cbc:CompanyID>{invoice.CustomerVatNumber}</cbc:CompanyID>");
        }
        sb.AppendLine("                <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>");
        sb.AppendLine("            </cac:PartyTaxScheme>");
        sb.AppendLine("            <cac:PartyLegalEntity>");
        sb.AppendLine($"                <cbc:RegistrationName>{invoice.CustomerName}</cbc:RegistrationName>");
        sb.AppendLine("            </cac:PartyLegalEntity>");
        sb.AppendLine("        </cac:Party>");
        sb.AppendLine("    </cac:AccountingCustomerParty>");

        // Totals
        sb.AppendLine("    <cac:LegalMonetaryTotal>");
        sb.AppendLine($"        <cbc:LineExtensionAmount currencyID=\"{invoice.Currency}\">{invoice.SubTotal:F2}</cbc:LineExtensionAmount>");
        sb.AppendLine($"        <cbc:TaxExclusiveAmount currencyID=\"{invoice.Currency}\">{invoice.TotalTaxableAmount:F2}</cbc:LineExtensionAmount>");
        sb.AppendLine($"        <cbc:TaxInclusiveAmount currencyID=\"{invoice.Currency}\">{invoice.TotalAmount:F2}</cbc:LineExtensionAmount>");
        sb.AppendLine($"        <cbc:AllowanceTotalAmount currencyID=\"{invoice.Currency}\">{invoice.TotalDiscount:F2}</cbc:AllowanceTotalAmount>");
        sb.AppendLine($"        <cbc:PayableAmount currencyID=\"{invoice.Currency}\">{invoice.TotalAmount:F2}</cbc:PayableAmount>");
        sb.AppendLine("    </cac:LegalMonetaryTotal>");

        // Lines
        foreach (var l in invoice.Lines)
        {
            sb.AppendLine("    <cac:InvoiceLine>");
            sb.AppendLine($"        <cbc:ID>{l.LineNumber}</cbc:ID>");
            sb.AppendLine($"        <cbc:InvoicedQuantity unitCode=\"PCE\">{l.Quantity}</cbc:InvoicedQuantity>");
            sb.AppendLine($"        <cbc:LineExtensionAmount currencyID=\"{invoice.Currency}\">{l.SubTotal:F2}</cbc:LineExtensionAmount>");
            sb.AppendLine("        <cac:Item>");
            sb.AppendLine($"            <cbc:Name>{l.ItemNameAr}</cbc:Name>");
            sb.AppendLine("        </cac:Item>");
            sb.AppendLine("        <cac:Price>");
            sb.AppendLine($"            <cbc:PriceAmount currencyID=\"{invoice.Currency}\">{l.UnitPrice:F2}</cbc:PriceAmount>");
            sb.AppendLine("        </cac:Price>");
            sb.AppendLine("    </cac:InvoiceLine>");
        }

        sb.AppendLine("</Invoice>");
        return sb.ToString();
    }

    private static void AddTlvTag(List<byte> dest, byte tag, byte[] val)
    {
        dest.Add(tag);
        dest.Add((byte)val.Length);
        dest.AddRange(val);
    }
}
