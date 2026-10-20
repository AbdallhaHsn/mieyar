using System.Text;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Extensions;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Application.Behaviors;
using AlRobban.Shared.Infrastructure.Dapper;
using AlRobban.Shared.Infrastructure.MultiTenancy;
using AlRobban.Shared.Infrastructure.Persistence.Interceptors;
using AlRobban.Shared.Infrastructure.Security;
using AlRobban.WebAPI.Hubs;
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
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService(serviceName: "AlRobban.Accounting.API"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddConsoleExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddConsoleExporter());

// 3. Core Framework & Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

// JWT Authentication Configuration
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "AlRobbanEnterpriseAccountingSuperSecretKey2026!#$@%";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// 4. Multi-Tenancy & Infrastructure
builder.Services.AddScoped<ICurrentTenantContext, TenantContext>();
builder.Services.AddScoped<AuditableEntityInterceptor>();
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton<IZatcaCryptoService, ZatcaCryptoService>();

// Register Modules
builder.Services.AddIdentityAndAccessModule(builder.Configuration);

// 5. MediatR & Pipeline Behaviors
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(ICurrentTenantContext).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(ICurrentTenantContext).Assembly);

// 6. Redis Distributed Cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    options.InstanceName = "AlRobban_";
});

// 7. CORS Configuration (Allows Angular Client)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
            .AllowAnyHeader()
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Al-Roban API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors("AllowClientApp");

app.UseAuthentication();
app.UseAuthorization();

// Map Endpoints & SignalR Hub
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// System Health & Info Endpoint
app.MapGet("/api/system/status", (ICurrentTenantContext tenantContext) => Results.Ok(new
{
    System = "Al-Roban Accounting & ERP Platform",
    Version = "1.0.0-Preview",
    Status = "Healthy",
    ServerTimeUtc = DateTime.UtcNow,
    ActiveTenant = tenantContext.TenantId ?? Guid.Empty,
    Features = new[]
    {
        "General Ledger & Chart of Accounts",
        "ZATCA Phase 2 E-Invoicing (UBL 2.1 & ECDSA Signatures)",
        "Dapper High-Speed Financial Reporting",
        "Multi-Tenancy with SESSION_CONTEXT",
        "SignalR Live Financial Notifications",
        "Distributed Redis Caching"
    }
})).WithName("GetSystemStatus").WithOpenApi();

app.Run();
