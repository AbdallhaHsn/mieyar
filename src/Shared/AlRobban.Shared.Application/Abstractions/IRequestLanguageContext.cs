namespace AlRobban.Shared.Application.Abstractions;

/// <summary>
/// Provides the active UI language ("ar" or "en") for the current HTTP request
/// based on the client's Accept-Language header.
/// </summary>
public interface IRequestLanguageContext
{
    string CurrentLanguage { get; }
    bool IsArabic => !string.Equals(CurrentLanguage, "en", StringComparison.OrdinalIgnoreCase);

    string Translate(string arabicText, string englishText) => IsArabic ? arabicText : englishText;
}

