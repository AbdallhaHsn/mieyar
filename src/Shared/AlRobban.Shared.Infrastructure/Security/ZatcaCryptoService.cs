using System.Security.Cryptography;
using System.Text;
using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;
using Org.BouncyCastle.OpenSsl;

namespace AlRobban.Shared.Infrastructure.Security;

public interface IZatcaCryptoService
{
    string ComputeSha256Hash(string xmlContent);
    byte[] SignData(byte[] dataToSign, string privateKeyPem);
    bool VerifySignature(byte[] data, byte[] signature, string publicKeyPem);
    string GenerateQrCodePayload(string sellerName, string vatRegistrationNumber, DateTime invoiceTimestamp, decimal invoiceTotal, decimal vatTotal, string invoiceHash, byte[] ecdsaSignature, byte[] ecdsaPublicKey);
}

public class ZatcaCryptoService : IZatcaCryptoService
{
    public string ComputeSha256Hash(string xmlContent)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(xmlContent);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public byte[] SignData(byte[] dataToSign, string privateKeyPem)
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

        // Standard 64-byte raw R||S signature (IEEE P1363)
        var signature = new byte[64];
        Buffer.BlockCopy(r, 0, signature, 32 - r.Length, r.Length);
        Buffer.BlockCopy(s, 0, signature, 64 - s.Length, s.Length);

        return signature;
    }

    public bool VerifySignature(byte[] data, byte[] signature, string publicKeyPem)
    {
        using var textReader = new StringReader(publicKeyPem);
        var pemReader = new PemReader(textReader);
        var keyObject = pemReader.ReadObject();

        ECPublicKeyParameters publicKey;
        if (keyObject is ECPublicKeyParameters ecPub)
        {
            publicKey = ecPub;
        }
        else
        {
            throw new ArgumentException("Invalid ECDSA public key PEM format");
        }

        var signer = new ECDsaSigner();
        signer.Init(false, publicKey);

        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(data);

        var r = new Org.BouncyCastle.Math.BigInteger(1, signature, 0, 32);
        var s = new Org.BouncyCastle.Math.BigInteger(1, signature, 32, 32);

        return signer.VerifySignature(hash, r, s);
    }

    public string GenerateQrCodePayload(
        string sellerName,
        string vatRegistrationNumber,
        DateTime invoiceTimestamp,
        decimal invoiceTotal,
        decimal vatTotal,
        string invoiceHash,
        byte[] ecdsaSignature,
        byte[] ecdsaPublicKey)
    {
        var stream = new MemoryStream();

        WriteTlvTag(stream, 1, Encoding.UTF8.GetBytes(sellerName));
        WriteTlvTag(stream, 2, Encoding.UTF8.GetBytes(vatRegistrationNumber));
        WriteTlvTag(stream, 3, Encoding.UTF8.GetBytes(invoiceTimestamp.ToString("yyyy-MM-ddTHH:mm:ssZ")));
        WriteTlvTag(stream, 4, Encoding.UTF8.GetBytes(invoiceTotal.ToString("F2")));
        WriteTlvTag(stream, 5, Encoding.UTF8.GetBytes(vatTotal.ToString("F2")));
        WriteTlvTag(stream, 6, Encoding.UTF8.GetBytes(invoiceHash));
        WriteTlvTag(stream, 7, ecdsaSignature);
        WriteTlvTag(stream, 8, ecdsaPublicKey);

        return Convert.ToBase64String(stream.ToArray());
    }

    private static void WriteTlvTag(Stream stream, byte tag, byte[] value)
    {
        stream.WriteByte(tag);
        stream.WriteByte((byte)value.Length);
        stream.Write(value, 0, value.Length);
    }
}
