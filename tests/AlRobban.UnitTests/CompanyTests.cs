using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using Xunit;

namespace AlRobban.UnitTests;

public class CompanyTests
{
    [Fact]
    public void CreateCompany_WithValidData_InitializesBilingualNamesAndBranding()
    {
        // Arrange
        var address = new NationalAddress("طريق الملك فهد", "1234", "العليا", "الرياض", "12345", "6789", "SA");
        var company = new Company(
            Guid.NewGuid(),
            "COMP01",
            "شركة الربان الذكية المحدودة",
            "Al-Roban Smart Co. Ltd.",
            "310123456700003",
            "1010123456",
            "SAR",
            address,
            "https://cdn.alrobban.com/logos/comp01.png",
            "#0f766e");

        // Act & Assert
        Assert.Equal("شركة الربان الذكية المحدودة", company.NameAr);
        Assert.Equal("Al-Roban Smart Co. Ltd.", company.NameEn);
        Assert.Equal("310123456700003", company.VatNumber);
        Assert.Equal("https://cdn.alrobban.com/logos/comp01.png", company.LogoUrl);
        Assert.Equal("#0f766e", company.BrandThemeColor);
        Assert.True(company.IsActive);
    }

    [Fact]
    public void AddFiscalYear_AutomaticallyGenerates12BilingualMonthlyPeriods()
    {
        // Arrange
        var address = new NationalAddress("طريق الملك فهد", "1234", "العليا", "الرياض", "12345", "6789", "SA");
        var company = new Company(
            Guid.NewGuid(),
            "COMP01",
            "شركة الربان",
            "Al-Roban Co.",
            "310123456700003",
            "1010123456",
            "SAR",
            address);

        // Act
        var fiscalYear = company.AddFiscalYear(
            2026,
            "السنة المالية 2026",
            "Fiscal Year 2026",
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Utc));

        // Assert
        Assert.Equal(12, fiscalYear.Periods.Count);
        Assert.Contains(fiscalYear.Periods, p => p.NameAr == "يناير 2026" && p.NameEn == "January 2026");
        Assert.Contains(fiscalYear.Periods, p => p.NameAr == "ديسمبر 2026" && p.NameEn == "December 2026");
    }

    [Fact]
    public void UpdateBranding_UpdatesLogoAndThemeColor()
    {
        // Arrange
        var address = new NationalAddress("شارع الملك عبدالعزيز", "5678", "الروضة", "جدة", "21452", "1111", "SA");
        var company = new Company(
            Guid.NewGuid(),
            "COMP02",
            "مؤسسة الأفق",
            "Horizon Est.",
            "310987654300003",
            "4030123456",
            "SAR",
            address);

        // Act
        company.UpdateBranding("https://cdn.alrobban.com/logos/horizon-new.png", "#1e3a8a");

        // Assert
        Assert.Equal("https://cdn.alrobban.com/logos/horizon-new.png", company.LogoUrl);
        Assert.Equal("#1e3a8a", company.BrandThemeColor);
    }
}
