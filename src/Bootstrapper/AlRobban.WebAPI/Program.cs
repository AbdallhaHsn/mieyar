using System.Text;
using Microsoft.EntityFrameworkCore;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Extensions;
using AlRobban.Modules.GeneralLedger.Infrastructure.Extensions;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Extensions;
using AlRobban.Modules.DocumentManagement.Infrastructure.Extensions;
using AlRobban.Modules.Purchasing.Infrastructure.Extensions;
using AlRobban.Modules.HumanResources.Infrastructure.Extensions;
using AlRobban.Modules.Projects.Infrastructure.Extensions;
using AlRobban.Modules.Manufacturing.Infrastructure.Extensions;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Application.Behaviors;
using AlRobban.Shared.Infrastructure.Dapper;
using AlRobban.Shared.Infrastructure.MultiTenancy;
using AlRobban.Shared.Infrastructure.Persistence.Interceptors;
using AlRobban.Shared.Infrastructure.Security;
using AlRobban.WebAPI.Hubs;
using AlRobban.WebAPI.Startup;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Setup
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File("logs/alrobban-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// 2. OpenTelemetry Tracing & Metrics
var enableOtConsole = builder.Configuration.GetValue<bool>("OpenTelemetry:EnableConsoleExporter", false);
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService(serviceName: "AlRobban.Accounting.API"))
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation()
               .AddHttpClientInstrumentation();
        if (enableOtConsole)
        {
            tracing.AddConsoleExporter();
        }
    })
    .WithMetrics(metrics =>
    {
        metrics.AddAspNetCoreInstrumentation();
        if (enableOtConsole)
        {
            metrics.AddConsoleExporter();
        }
    });

// 3. Core Framework & Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AlRobban.WebAPI.Security.TenantEnforcementFilter>();
    options.Filters.Add<AlRobban.WebAPI.Security.AuditorWriteGuardFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();

// JWT Authentication Configuration (secret is mandatory - never hardcoded)
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey) || Encoding.UTF8.GetByteCount(jwtSecretKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:SecretKey is missing or shorter than 32 bytes. Configure it via user-secrets, appsettings.Development.json or the Jwt__SecretKey environment variable.");
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "AlRobban.Security";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "AlRobban.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };

    // Allow SignalR WebSocket connections to authenticate via ?access_token=
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(accessToken) &&
                context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Secure by default: every endpoint requires an authenticated user unless [AllowAnonymous]
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// 4. Multi-Tenancy & Infrastructure
builder.Services.AddScoped<ICurrentTenantContext, TenantContext>();
builder.Services.AddScoped<IRequestLanguageContext, RequestLanguageContext>();
builder.Services.AddScoped<AlRobban.WebAPI.Security.ILicenseService, AlRobban.WebAPI.Security.LicenseService>();
builder.Services.AddScoped<AuditableEntityInterceptor>();
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton<IZatcaCryptoService, ZatcaCryptoService>();

// Register Modules
builder.Services.AddIdentityAndAccessModule(builder.Configuration);
builder.Services.AddGeneralLedgerModule(builder.Configuration);
builder.Services.AddInvoicingAndZatcaModule(builder.Configuration);
builder.Services.AddDocumentManagementModule(builder.Configuration);
builder.Services.AddPurchasingModule(builder.Configuration);
builder.Services.AddHumanResourcesModule(builder.Configuration);
builder.Services.AddProjectsModule(builder.Configuration);
builder.Services.AddManufacturingModule(builder.Configuration);

// 5. MediatR & Pipeline Behaviors
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(ICurrentTenantContext).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(ICurrentTenantContext).Assembly);

// 6. Redis Distributed Cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    options.InstanceName = "AlRobban_";
});

// 7. CORS Configuration
var configuredOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
var allowedCorsOrigins = configuredOrigins != null && configuredOrigins.Length > 0
    ? configuredOrigins
    : new[] { "http://localhost:4200", "http://127.0.0.1:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApp", policy =>
    {
        policy.WithOrigins(allowedCorsOrigins)
            .WithHeaders("Authorization", "Content-Type", "X-Tenant-Id", "Accept", "Accept-Language", "X-Lang")
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 8. Swagger / OpenAPI Documentation
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Al-Roban ERP & Accounting Core API",
        Version = "v1",
        Description = "Modular Monolith Accounting & Invoicing (ZATCA Phase 2) Platform"
    });

    c.CustomSchemaIds(type => type.FullName);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure Middleware Pipeline
// تمكين Swagger UI في جميع البيئات (Development و Production) للمعاينة والاختبار السهل
{
    // Swagger UI bundle parser compatibility fix: Swashbuckle + Microsoft.OpenApi outputs "openapi": "3.0.4"
    // which bundled Swagger UI regex rejects with "The provided definition does not specify a valid version field".
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.Value?.EndsWith("/swagger.json", StringComparison.OrdinalIgnoreCase) == true)
        {
            var originalBodyStream = context.Response.Body;
            await using var memoryStream = new MemoryStream();
            context.Response.Body = memoryStream;

            await next();

            if (context.Response.StatusCode == 200)
            {
                memoryStream.Position = 0;
                using var reader = new StreamReader(memoryStream);
                var json = await reader.ReadToEndAsync();
                // استبدال أي إصدار 3.0.x بـ 3.0.1 لضمان توافق Swagger UI
                var patched = System.Text.RegularExpressions.Regex.Replace(
                    json,
                    @"""openapi""\s*:\s*""3\.0\.\d+""",
                    @"""openapi"": ""3.0.1""");

                context.Response.Body = originalBodyStream;
                context.Response.ContentType = "application/json;charset=utf-8";
                await context.Response.WriteAsync(patched);
                return;
            }

            memoryStream.Position = 0;
            context.Response.Body = originalBodyStream;
            await memoryStream.CopyToAsync(originalBodyStream);
            return;
        }

        await next();
    });

    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Al-Roban API v1");
        c.RoutePrefix = "swagger";
    });
}

// Friendly landing for direct browser visits & SignalR Hub status
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.TrimEnd('/') ?? "";
    var accept = context.Request.Headers.Accept.ToString();
    var isBrowserHtml = accept.Contains("text/html");

    // Redirect root to Swagger UI when opened in browser
    if (string.IsNullOrEmpty(path))
    {
        if (isBrowserHtml)
        {
            context.Response.Redirect("/swagger");
            return;
        }
    }

    // Render informative status page when /hubs/notifications is opened directly in browser
    if (path.Equals("/hubs/notifications", StringComparison.OrdinalIgnoreCase) &&
        HttpMethods.IsGet(context.Request.Method) &&
        isBrowserHtml &&
        !context.Request.Headers.ContainsKey("Upgrade"))
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(GetHubStatusHtml());
        return;
    }

    await next();
});

app.UseSerilogRequestLogging();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowClientApp");

app.UseAuthentication();
app.UseAuthorization();

// Map Endpoints & SignalR Hub (AllowAnonymous so SignalR negotiation and public hub status succeed)
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").AllowAnonymous();

// System Health Endpoint (anonymous, intentionally minimal - no tenant or feature disclosure)
app.MapGet("/api/system/status", () => Results.Ok(new
{
    Status = "Healthy",
    ServerTimeUtc = DateTime.UtcNow
})).AllowAnonymous().WithName("GetSystemStatus").WithOpenApi();

// Apply EF Core migrations for all modules (fail-fast; legacy databases are baselined, never re-created)
await app.MigrateDatabasesAsync();

static string GetHubStatusHtml() => """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>منفذ الإشعارات والربط اللحظي - نظام الربان ERP</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0284c7;
            --emerald: #059669;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%, #020617 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-main);
            padding: 24px;
        }
        .card {
            background: rgba(30, 41, 59, 0.88);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 20px;
            max-width: 660px;
            width: 100%;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.55);
            text-align: center;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(52, 211, 153, 0.35);
            padding: 6px 18px;
            border-radius: 9999px;
            font-size: 0.92rem;
            font-weight: 700;
            margin-bottom: 22px;
        }
        .pulse-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #10b981;
            box-shadow: 0 0 12px #10b981;
            animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
        }
        h1 {
            font-size: 1.85rem;
            font-weight: 800;
            margin-bottom: 12px;
            color: #ffffff;
            letter-spacing: -0.02em;
        }
        p.subtitle {
            color: var(--text-muted);
            font-size: 1rem;
            line-height: 1.75;
            margin-bottom: 28px;
        }
        .info-grid {
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 30px;
            text-align: right;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .info-label {
            font-size: 0.8rem;
            color: var(--text-muted);
        }
        .info-val {
            font-size: 0.95rem;
            font-weight: 600;
            color: #e2e8f0;
            direction: ltr;
            text-align: right;
        }
        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 22px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.92rem;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .btn-primary {
            background: linear-gradient(135deg, #0284c7, #2563eb);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #cbd5e1;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.16);
            color: #ffffff;
            transform: translateY(-2px);
        }
        .footer-note {
            margin-top: 24px;
            font-size: 0.82rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="status-badge">
            <span class="pulse-dot"></span>
            الخدمة نشطة ومتصلة • Online & Operational
        </div>
        <h1>منفذ الإشعارات والربط اللحظي (SignalR Hub)</h1>
        <p class="subtitle">
            يعمل منفذ الربط المباشر لنظام <strong>الربان ERP</strong> بكفاءة تامة. هذا المسار مخصص لبروتوكول WebSocket لنقل التنبيهات والأحداث الحية تلقائياً بين الخادم والواجهة.
        </p>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">المسار المباشر (Hub Path):</span>
                <span class="info-val">/hubs/notifications</span>
            </div>
            <div class="info-item">
                <span class="info-label">بروتوكول الاتصال:</span>
                <span class="info-val">WebSockets / Server-Sent Events</span>
            </div>
            <div class="info-item">
                <span class="info-label">الحالة التشغيلية:</span>
                <span class="info-val" style="color: #34d399;">Active (200 OK)</span>
            </div>
            <div class="info-item">
                <span class="info-label">الهيكل المعماري:</span>
                <span class="info-val">Al-Roban Modular Monolith</span>
            </div>
        </div>
        <div class="btn-group">
            <a href="http://localhost:4200" class="btn btn-primary">
                🚀 الدخول إلى واجهة النظام (Angular UI)
            </a>
            <a href="/swagger" class="btn btn-secondary">
                📑 توثيق الـ API (Swagger UI)
            </a>
            <a href="/api/system/status" class="btn btn-secondary">
                🩺 فحص صحة النظام (Health API)
            </a>
        </div>
        <p class="footer-note">نظام الربان المحاسبي والإداري المتكامل — Al-Roban ERP Core API</p>
    </div>
</body>
</html>
""";

app.Run();

public partial class Program { }
