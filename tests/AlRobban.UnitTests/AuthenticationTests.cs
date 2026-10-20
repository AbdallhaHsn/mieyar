using System.IdentityModel.Tokens.Jwt;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AlRobban.UnitTests;

public class AuthenticationTests
{
    private readonly PasswordHasher _passwordHasher = new();

    [Fact]
    public void PasswordHasher_HashesAndVerifiesPasswordCorrectly()
    {
        // Arrange
        var password = "SecureP@ssword2026!";

        // Act
        var hash = _passwordHasher.HashPassword(password);
        var isValid = _passwordHasher.VerifyPassword(password, hash);
        var isInvalid = _passwordHasher.VerifyPassword("WrongPassword123!", hash);

        // Assert
        Assert.NotNull(hash);
        Assert.Contains(".", hash);
        Assert.True(isValid);
        Assert.False(isInvalid);
    }

    [Fact]
    public void JwtTokenService_GeneratesTokenWithTenantAndCompanyClaims()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:SecretKey", "SuperSecretTestingKeyForJwtValidation2026!@#" },
            { "Jwt:Issuer", "AlRobban.Security" },
            { "Jwt:Audience", "AlRobban.Client" },
            { "Jwt:ExpiryDays", "7" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var jwtService = new JwtTokenService(configuration);

        var tenantId = Guid.NewGuid();
        var user = new User(
            Guid.NewGuid(),
            tenantId,
            "admin_co01",
            "admin@comp01.com",
            _passwordHasher.HashPassword("Pass123!"),
            "أحمد المحاسب",
            "Ahmed Accountant",
            UserRole.CompanyAdmin);

        var address = new NationalAddress("شارع العليا", "1234", "العليا", "الرياض", "12345");
        var company = new Company(
            tenantId,
            "COMP01",
            "شركة الأفق المالي",
            "Horizon Financial Co.",
            "310123456700003",
            "1010998877",
            "SAR",
            address,
            "https://cdn.alrobban.com/logo.png",
            "#0f766e");

        // Act
        var response = jwtService.GenerateToken(user, company);

        // Assert
        Assert.NotNull(response.Token);
        Assert.Equal(user.Id, response.UserId);
        Assert.Equal("CompanyAdmin", response.Role);
        Assert.Equal(tenantId, response.TenantId);
        Assert.Equal("شركة الأفق المالي", response.CompanyNameAr);

        // Parse JWT and check claims
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(response.Token);

        Assert.Equal(tenantId.ToString(), jwtToken.Claims.First(c => c.Type == "tenant_id").Value);
        Assert.Equal("COMP01", jwtToken.Claims.First(c => c.Type == "company_code").Value);
    }

    [Fact]
    public void SuperAdmin_CanHaveNullTenantId_ForPlatformManagement()
    {
        // Arrange
        var superAdmin = new User(
            Guid.NewGuid(),
            tenantId: null, // Platform Owner
            "superadmin",
            "owner@alrobban.com",
            _passwordHasher.HashPassword("Admin2026!"),
            "المدير العام للمنصة",
            "Platform Super Admin",
            UserRole.SuperAdmin);

        // Assert
        Assert.Null(superAdmin.TenantId);
        Assert.Equal(UserRole.SuperAdmin, superAdmin.Role);
    }
}
