using AlRobban.Shared.Infrastructure.Security;
using Xunit;

namespace AlRobban.UnitTests;

public class ZatcaCryptoServiceTests
{
    private readonly ZatcaCryptoService _cryptoService = new();

    [Fact]
    public void ComputeSha256Hash_WithValidXml_ReturnsBase64EncodedHash()
    {
        // Arrange
        var testXml = "<Invoice><ID>INV-2026-0001</ID><IssueDate>2026-10-20</IssueDate></Invoice>";

        // Act
        var hash = _cryptoService.ComputeSha256Hash(testXml);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
        // Valid Base64 check
        var bytes = Convert.FromBase64String(hash);
        Assert.Equal(32, bytes.Length); // SHA-256 produces 32 bytes
    }

    [Fact]
    public void GenerateQrCodePayload_GeneratesValidTlvBase64()
    {
        // Arrange
        var sellerName = "شركة الربان الذكية المحدودة";
        var vatNumber = "310123456700003";
        var timestamp = new DateTime(2026, 10, 20, 14, 30, 0, DateTimeKind.Utc);
        var total = 1150.00m;
        var vat = 150.00m;
        var invoiceHash = "NWZkODAzMzRiNGQw...";
        var mockSignature = new byte[64];
        var mockPublicKey = new byte[64];

        // Act
        var qrBase64 = _cryptoService.GenerateQrCodePayload(
            sellerName,
            vatNumber,
            timestamp,
            total,
            vat,
            invoiceHash,
            mockSignature,
            mockPublicKey);

        // Assert
        Assert.NotNull(qrBase64);
        var tlvBytes = Convert.FromBase64String(qrBase64);
        Assert.NotEmpty(tlvBytes);
        Assert.Equal(1, tlvBytes[0]); // Tag 1: Seller Name
    }
}
