using System.Text;
using System.Text.Json;
using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/translation")]
[AllowAnonymous]
[SkipTenantEnforcement]
public class TranslationController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TranslationController> _logger;

    public TranslationController(IHttpClientFactory httpClientFactory, ILogger<TranslationController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("translate")]
    public async Task<IActionResult> TranslateGet([FromQuery] string text, [FromQuery] string from = "ar", [FromQuery] string to = "en")
    {
        return await PerformTranslation(text, from, to);
    }

    [HttpPost("translate")]
    public async Task<IActionResult> TranslatePost([FromBody] TranslationRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new { error = "Text to translate is required" });
        }
        return await PerformTranslation(request.Text, request.From ?? "ar", request.To ?? "en");
    }

    private async Task<IActionResult> PerformTranslation(string text, string from, string to)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return Ok(new { translatedText = string.Empty, from, to });
        }

        var trimmed = text.Trim();
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(5);
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        // 1. Primary Engine: Google Translate Free RPC Endpoint
        try
        {
            var googleUrl = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl={from}&tl={to}&dt=t&q={Uri.EscapeDataString(trimmed)}";
            var response = await client.GetAsync(googleUrl);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    var chunks = root[0];
                    if (chunks.ValueKind == JsonValueKind.Array)
                    {
                        var sb = new StringBuilder();
                        foreach (var chunk in chunks.EnumerateArray())
                        {
                            if (chunk.ValueKind == JsonValueKind.Array && chunk.GetArrayLength() > 0)
                            {
                                var part = chunk[0].GetString();
                                if (!string.IsNullOrEmpty(part))
                                {
                                    sb.Append(part);
                                }
                            }
                        }
                        var translated = sb.ToString().Trim();
                        if (!string.IsNullOrEmpty(translated))
                        {
                            return Ok(new { translatedText = translated, originalText = trimmed, from, to, engine = "google" });
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google translation call failed for: {Text}", trimmed);
        }

        // 2. Secondary Engine: MyMemory Translation API
        try
        {
            var myMemoryUrl = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(trimmed)}&langpair={from}|{to}";
            var response = await client.GetAsync(myMemoryUrl);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                if (doc.RootElement.TryGetProperty("responseData", out var respData) &&
                    respData.TryGetProperty("translatedText", out var transTextElem))
                {
                    var translated = transTextElem.GetString();
                    if (!string.IsNullOrEmpty(translated) && !translated.Contains("MYMEMORY WARNING"))
                    {
                        return Ok(new { translatedText = translated.Trim(), originalText = trimmed, from, to, engine = "mymemory" });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MyMemory fallback translation failed for: {Text}", trimmed);
        }

        return Ok(new { translatedText = string.Empty, originalText = trimmed, from, to, error = "Translation services unavailable" });
    }
}

public class TranslationRequest
{
    public string Text { get; set; } = string.Empty;
    public string From { get; set; } = "ar";
    public string To { get; set; } = "en";
}
