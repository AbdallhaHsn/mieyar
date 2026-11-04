using System.Security.Cryptography;
using System.Text;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;
using Org.BouncyCastle.OpenSsl;

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
        return GeneratePhase2QrCode(sellerName, sellerVat, timestamp, totalAmount, vatAmount, invoiceHash, null, null);
    }

    public string GeneratePhase2QrCode(
        string sellerName,
        string sellerVat,
        DateTime timestamp,
        decimal totalAmount,
        decimal vatAmount,
        string invoiceHash,
        string? privateKeyPem = null,
        string? publicKeyPem = null)
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

        // Tag 7: ECDSA Digital Signature (Raw 64 bytes)
        if (!string.IsNullOrWhiteSpace(privateKeyPem))
        {
            try
            {
                var sigRaw = SignDataRaw(Encoding.UTF8.GetBytes(invoiceHash), privateKeyPem);
                AddTlvTag(tlvs, 7, sigRaw);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"فشل التوقيع الرقمي للفاتورة (ECDSA): {ex.Message}", ex);
            }
        }

        // Tag 8: ECDSA Public Key (Raw uncompressed bytes)
        if (!string.IsNullOrWhiteSpace(publicKeyPem))
        {
            try
            {
                var pubRaw = ExtractPublicKeyRaw(publicKeyPem);
                if (pubRaw != null && pubRaw.Length > 0)
                {
                    AddTlvTag(tlvs, 8, pubRaw);
                }
            }
            catch
            {
            }
        }

        return Convert.ToBase64String(tlvs.ToArray());
    }

    public string SignHash(string hashBase64, string privateKeyPem)
    {
        var rawSig = SignDataRaw(Encoding.UTF8.GetBytes(hashBase64), privateKeyPem);
        return Convert.ToBase64String(rawSig);
    }

    private static byte[] SignDataRaw(byte[] dataToSign, string privateKeyPem)
    {
        using var textReader = new StringReader(privateKeyPem);
        var pemReader = new PemReader(textReader);
        var keyObject = pemReader.ReadObject();

        ECPrivateKeyParameters privateKey;
        if (keyObject is Org.BouncyCastle.Crypto.AsymmetricCipherKeyPair keyPair)
        {
            privateKey = (ECPrivateKeyParameters)keyPair.Private;
        }
        else if (keyObject is ECPrivateKeyParameters ecKey)
        {
            privateKey = ecKey;
        }
        else
        {
            throw new ArgumentException("Invalid ECDSA private key PEM format");
        }

        var signer = new ECDsaSigner(new HMacDsaKCalculator(new Sha256Digest()));
        signer.Init(true, privateKey);

        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(dataToSign);

        var components = signer.GenerateSignature(hash);
        var r = components[0].ToByteArrayUnsigned();
        var s = components[1].ToByteArrayUnsigned();

        // 64-byte raw signature IEEE P1363 (32 bytes R + 32 bytes S)
        var signature = new byte[64];
        Buffer.BlockCopy(r, 0, signature, 32 - r.Length, r.Length);
        Buffer.BlockCopy(s, 0, signature, 64 - s.Length, s.Length);

        return signature;
    }

    private static byte[]? ExtractPublicKeyRaw(string publicKeyPem)
    {
        using var textReader = new StringReader(publicKeyPem);
        var pemReader = new PemReader(textReader);
        var keyObject = pemReader.ReadObject();

        if (keyObject is ECPublicKeyParameters ecPub)
        {
            return ecPub.Q.GetEncoded(false); // uncompressed bytes
        }

        return null;
    }

    public string GenerateInvoiceXml(
        Invoice invoice, 
        string sellerName, 
        string sellerVat,
        string? digitalSignature = null,
        string? certificateBase64 = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"");
        sb.AppendLine("         xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"");
        sb.AppendLine("         xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\"");
        sb.AppendLine("         xmlns:ext=\"urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2\">");

        // UBL Extension: ZATCA Digital Signature & Security Token
        if (!string.IsNullOrWhiteSpace(digitalSignature))
        {
            sb.AppendLine("    <ext:UBLExtensions>");
            sb.AppendLine("        <ext:UBLExtension>");
            sb.AppendLine("            <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>");
            sb.AppendLine("            <ext:ExtensionContent>");
            sb.AppendLine("                <sig:UBLDocumentSignatures xmlns:sig=\"urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2\"");
            sb.AppendLine("                                            xmlns:sac=\"urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2\"");
            sb.AppendLine("                                            xmlns:sbc=\"urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2\">");
            sb.AppendLine("                    <sac:SignatureInformation>");
            sb.AppendLine("                        <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>");
            sb.AppendLine("                        <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>");
            sb.AppendLine("                        <ds:Signature xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\" Id=\"signature\">");
            sb.AppendLine("                            <ds:SignedInfo>");
            sb.AppendLine("                                <ds:CanonicalizationMethod Algorithm=\"http://www.w3.org/2006/12/xml-c14n11\"/>");
            sb.AppendLine("                                <ds:SignatureMethod Algorithm=\"http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256\"/>");
            sb.AppendLine("                            </ds:SignedInfo>");
            sb.AppendLine($"                            <ds:SignatureValue>{digitalSignature}</ds:SignatureValue>");
            if (!string.IsNullOrWhiteSpace(certificateBase64))
            {
                sb.AppendLine("                            <ds:KeyInfo>");
                sb.AppendLine("                                <ds:X509Data>");
                sb.AppendLine($"                                    <ds:X509Certificate>{certificateBase64}</ds:X509Certificate>");
                sb.AppendLine("                                </ds:X509Data>");
                sb.AppendLine("                            </ds:KeyInfo>");
            }
            sb.AppendLine("                        </ds:Signature>");
            sb.AppendLine("                    </sac:SignatureInformation>");
            sb.AppendLine("                </sig:UBLDocumentSignatures>");
            sb.AppendLine("            </ext:ExtensionContent>");
            sb.AppendLine("        </ext:UBLExtension>");
            sb.AppendLine("    </ext:UBLExtensions>");
        }

        sb.AppendLine($"    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>");
        sb.AppendLine($"    <cbc:ID>{invoice.InvoiceNumber}</cbc:ID>");
        sb.AppendLine($"    <cbc:UUID>{invoice.Uuid}</cbc:UUID>");
        sb.AppendLine($"    <cbc:IssueDate>{invoice.IssueDate:yyyy-MM-dd}</cbc:IssueDate>");
        sb.AppendLine($"    <cbc:IssueTime>{invoice.IssueTime:hh\\:mm\\:ss}</cbc:IssueTime>");
        sb.AppendLine($"    <cbc:InvoiceTypeCode name=\"{(int)invoice.InvoiceType}\">{(invoice.InvoiceType == Domain.Enums.InvoiceType.Standard ? "388" : "381")}</cbc:InvoiceTypeCode>");
        sb.AppendLine($"    <cbc:DocumentCurrencyCode>{invoice.Currency}</cbc:DocumentCurrencyCode>");
        sb.AppendLine($"    <cbc:TaxCurrencyCode>{invoice.Currency}</cbc:TaxCurrencyCode>");

        // Invoice Chaining (PIH) & Counter (ICV)
        sb.AppendLine("    <cac:AdditionalDocumentReference>");
        sb.AppendLine("        <cbc:ID>ICV</cbc:ID>");
        sb.AppendLine("        <cbc:UUID>1</cbc:UUID>");
        sb.AppendLine("    </cac:AdditionalDocumentReference>");

        if (!string.IsNullOrWhiteSpace(invoice.PreviousInvoiceHash))
        {
            sb.AppendLine("    <cac:AdditionalDocumentReference>");
            sb.AppendLine("        <cbc:ID>PIH</cbc:ID>");
            sb.AppendLine("        <cac:Attachment>");
            sb.AppendLine($"            <cbc:EmbeddedDocumentBinaryObject mimeCode=\"text/plain\">{invoice.PreviousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject>");
            sb.AppendLine("        </cac:Attachment>");
            sb.AppendLine("    </cac:AdditionalDocumentReference>");
        }

        if (!string.IsNullOrWhiteSpace(invoice.QrCodePayload))
        {
            sb.AppendLine("    <cac:AdditionalDocumentReference>");
            sb.AppendLine("        <cbc:ID>QR</cbc:ID>");
            sb.AppendLine("        <cac:Attachment>");
            sb.AppendLine($"            <cbc:EmbeddedDocumentBinaryObject mimeCode=\"text/plain\">{invoice.QrCodePayload}</cbc:EmbeddedDocumentBinaryObject>");
            sb.AppendLine("        </cac:Attachment>");
            sb.AppendLine("    </cac:AdditionalDocumentReference>");
        }

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
