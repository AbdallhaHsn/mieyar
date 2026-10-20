namespace AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;

public record NationalAddress
{
    public string StreetName { get; init; } = string.Empty;
    public string BuildingNumber { get; init; } = string.Empty;
    public string SubDivisionName { get; init; } = string.Empty;
    public string CityName { get; init; } = string.Empty;
    public string PostalZone { get; init; } = string.Empty;
    public string? AdditionalNumber { get; init; }
    public string CountryCode { get; init; } = "SA";

    public NationalAddress() { }

    public NationalAddress(
        string streetName,
        string buildingNumber,
        string subDivisionName,
        string cityName,
        string postalZone,
        string? additionalNumber = null,
        string countryCode = "SA")
    {
        StreetName = streetName;
        BuildingNumber = buildingNumber;
        SubDivisionName = subDivisionName;
        CityName = cityName;
        PostalZone = postalZone;
        AdditionalNumber = additionalNumber;
        CountryCode = countryCode;
    }
}
