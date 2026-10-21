using System.Text;
using Microsoft.EntityFrameworkCore;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Extensions;
using AlRobban.Modules.GeneralLedger.Infrastructure.Extensions;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Extensions;
using AlRobban.Modules.DocumentManagement.Infrastructure.Extensions;
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
builder.Services.AddGeneralLedgerModule(builder.Configuration);
builder.Services.AddInvoicingAndZatcaModule(builder.Configuration);
builder.Services.AddDocumentManagementModule(builder.Configuration);

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
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
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

// Ensure DB Schemas and Tables
using (var scope = app.Services.CreateScope())
{
    try
    {
        var idDb = scope.ServiceProvider.GetRequiredService<AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.IdentityAndAccessDbContext>();
        var glDb = scope.ServiceProvider.GetRequiredService<AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.GeneralLedgerDbContext>();
        var invDb = scope.ServiceProvider.GetRequiredService<AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence.InvoicingDbContext>();
        var docDb = scope.ServiceProvider.GetRequiredService<AlRobban.Modules.DocumentManagement.Infrastructure.Persistence.DocumentManagementDbContext>();
        await idDb.Database.EnsureCreatedAsync();
        await glDb.Database.EnsureCreatedAsync();
        await invDb.Database.EnsureCreatedAsync();
        await docDb.Database.EnsureCreatedAsync();

        // Ensure Recurring Entries & PDC & Partners & Currencies tables exist in DB
        await glDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'RecurringJournalEntries' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[RecurringJournalEntries] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [CompanyId] uniqueidentifier NOT NULL,
                    [Title] nvarchar(200) NOT NULL,
                    [DescriptionAr] nvarchar(500) NOT NULL,
                    [DescriptionEn] nvarchar(500) NOT NULL,
                    [Frequency] int NOT NULL,
                    [StartDate] datetime2 NOT NULL,
                    [EndDate] datetime2 NULL,
                    [NextRunDate] datetime2 NOT NULL,
                    [LastRunDate] datetime2 NULL,
                    [ExecutionCount] int NOT NULL,
                    [IsActive] bit NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(100) NULL,
                    [LastModifiedAtUtc] datetime2 NULL,
                    [LastModifiedBy] nvarchar(100) NULL,
                    CONSTRAINT [PK_RecurringJournalEntries] PRIMARY KEY ([Id])
                );
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'RecurringJournalEntryLines' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[RecurringJournalEntryLines] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [RecurringEntryId] uniqueidentifier NOT NULL,
                    [AccountId] uniqueidentifier NOT NULL,
                    [Debit] decimal(18,4) NOT NULL,
                    [Credit] decimal(18,4) NOT NULL,
                    [Description] nvarchar(500) NOT NULL,
                    [CostCenterId] uniqueidentifier NULL,
                    CONSTRAINT [PK_RecurringJournalEntryLines] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_RecurringJournalEntryLines_RecurringJournalEntries] FOREIGN KEY ([RecurringEntryId]) REFERENCES [dbo].[RecurringJournalEntries] ([Id]) ON DELETE CASCADE
                );
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'PostDatedChecks' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[PostDatedChecks] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [CompanyId] uniqueidentifier NOT NULL,
                    [CheckNumber] nvarchar(50) NOT NULL,
                    [BankName] nvarchar(100) NOT NULL,
                    [DrawerName] nvarchar(250) NOT NULL,
                    [Amount] decimal(18,4) NOT NULL,
                    [Currency] nvarchar(10) NOT NULL,
                    [IssueDate] datetime2 NOT NULL,
                    [DueDate] datetime2 NOT NULL,
                    [CheckType] int NOT NULL,
                    [Status] int NOT NULL,
                    [BankAccountId] uniqueidentifier NULL,
                    [PartnerAccountId] uniqueidentifier NULL,
                    [AssociatedJournalEntryId] uniqueidentifier NULL,
                    [BounceReason] nvarchar(500) NULL,
                    [BounceFee] decimal(18,4) NOT NULL,
                    [Notes] nvarchar(max) NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(100) NULL,
                    [LastModifiedAtUtc] datetime2 NULL,
                    [LastModifiedBy] nvarchar(100) NULL,
                    CONSTRAINT [PK_PostDatedChecks] PRIMARY KEY ([Id])
                );
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'BusinessPartners' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[BusinessPartners] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [CompanyId] uniqueidentifier NOT NULL,
                    [Code] nvarchar(50) NOT NULL,
                    [PartnerType] int NOT NULL,
                    [NameAr] nvarchar(250) NOT NULL,
                    [NameEn] nvarchar(250) NOT NULL,
                    [TaxNumber] nvarchar(50) NULL,
                    [CommercialRegistration] nvarchar(50) NULL,
                    [Phone] nvarchar(50) NULL,
                    [Email] nvarchar(100) NULL,
                    [Address] nvarchar(500) NULL,
                    [StreetName] nvarchar(250) NULL,
                    [BuildingNumber] nvarchar(10) NULL,
                    [PlotIdentification] nvarchar(10) NULL,
                    [CitySubdivisionName] nvarchar(150) NULL,
                    [CityName] nvarchar(100) NULL,
                    [PostalZone] nvarchar(10) NULL,
                    [CountryCode] nvarchar(10) NOT NULL DEFAULT 'SA',
                    [OtherIdType] nvarchar(20) NULL,
                    [OtherIdValue] nvarchar(50) NULL,
                    [CreditLimit] decimal(18,4) NOT NULL,
                    [PaymentTermsDays] int NOT NULL,
                    [GlAccountId] uniqueidentifier NULL,
                    [CurrentBalance] decimal(18,4) NOT NULL,
                    [IsActive] bit NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(100) NULL,
                    [LastModifiedAtUtc] datetime2 NULL,
                    [LastModifiedBy] nvarchar(100) NULL,
                    CONSTRAINT [PK_BusinessPartners] PRIMARY KEY ([Id])
                );
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BusinessPartners') AND name = 'StreetName')
                BEGIN
                    ALTER TABLE [dbo].[BusinessPartners] ADD
                        [StreetName] nvarchar(250) NULL,
                        [BuildingNumber] nvarchar(10) NULL,
                        [PlotIdentification] nvarchar(10) NULL,
                        [CitySubdivisionName] nvarchar(150) NULL,
                        [CityName] nvarchar(100) NULL,
                        [PostalZone] nvarchar(10) NULL,
                        [CountryCode] nvarchar(10) NOT NULL CONSTRAINT DF_BP_Country DEFAULT 'SA',
                        [OtherIdType] nvarchar(20) NULL,
                        [OtherIdValue] nvarchar(50) NULL;
                END
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'CurrencyRates' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[CurrencyRates] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [CompanyId] uniqueidentifier NOT NULL,
                    [CurrencyCode] nvarchar(10) NOT NULL,
                    [CurrencyNameAr] nvarchar(100) NOT NULL,
                    [CurrencyNameEn] nvarchar(100) NOT NULL,
                    [ExchangeRateToSar] decimal(18,4) NOT NULL,
                    [EffectiveDate] datetime2 NOT NULL,
                    [IsActive] bit NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(100) NULL,
                    [LastModifiedAtUtc] datetime2 NULL,
                    [LastModifiedBy] nvarchar(100) NULL,
                    CONSTRAINT [PK_CurrencyRates] PRIMARY KEY ([Id])
                );
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'DocumentAttachments' AND s.name = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[DocumentAttachments] (
                    [Id] uniqueidentifier NOT NULL,
                    [TenantId] uniqueidentifier NOT NULL,
                    [CompanyId] uniqueidentifier NOT NULL,
                    [EntityType] nvarchar(100) NOT NULL,
                    [EntityId] uniqueidentifier NOT NULL,
                    [FileName] nvarchar(250) NOT NULL,
                    [ContentType] nvarchar(100) NOT NULL,
                    [FileSizeBytes] bigint NOT NULL,
                    [FileContentBase64] nvarchar(max) NOT NULL,
                    [Description] nvarchar(max) NULL,
                    [IsDeleted] bit NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(100) NULL,
                    [LastModifiedAtUtc] datetime2 NULL,
                    [LastModifiedBy] nvarchar(100) NULL,
                    CONSTRAINT [PK_DocumentAttachments] PRIMARY KEY ([Id])
                );
            END;
        ");

        // Ensure 'inv' schema and tables exist for ZATCA E-Invoicing
        await invDb.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'inv')
                EXEC('CREATE SCHEMA inv');

            IF EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'InvoiceLines' AND s.name = 'inv')
                DROP TABLE [inv].[InvoiceLines];

            IF EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Invoices' AND s.name = 'inv')
                DROP TABLE [inv].[Invoices];

            CREATE TABLE [inv].[Invoices] (
                [Id] uniqueidentifier NOT NULL,
                [TenantId] uniqueidentifier NOT NULL,
                [CompanyId] uniqueidentifier NOT NULL,
                [InvoiceNumber] nvarchar(50) NOT NULL,
                [Uuid] uniqueidentifier NOT NULL,
                [IssueDate] datetime2 NOT NULL,
                [IssueTime] time NOT NULL,
                [InvoiceType] int NOT NULL,
                [TransactionType] int NOT NULL,
                [Status] int NOT NULL,
                [Currency] nvarchar(10) NOT NULL,
                [CustomerName] nvarchar(250) NOT NULL,
                [CustomerVatNumber] nvarchar(50) NULL,
                [CustomerCrNumber] nvarchar(50) NULL,
                [CustomerAddress] nvarchar(500) NULL,
                [ReferenceInvoiceId] uniqueidentifier NULL,
                [ReferenceInvoiceNumber] nvarchar(50) NULL,
                [ModificationReason] nvarchar(500) NULL,
                [SubTotal] decimal(18,4) NOT NULL,
                [TotalDiscount] decimal(18,4) NOT NULL,
                [TotalTaxableAmount] decimal(18,4) NOT NULL,
                [TotalVat] decimal(18,4) NOT NULL,
                [TotalAmount] decimal(18,4) NOT NULL,
                [PreviousInvoiceHash] nvarchar(200) NOT NULL,
                [InvoiceHash] nvarchar(200) NULL,
                [CryptographicStamp] nvarchar(max) NULL,
                [QrCodePayload] nvarchar(max) NULL,
                [AssociatedJournalEntryId] uniqueidentifier NULL,
                [AssociatedJournalEntryNumber] nvarchar(50) NULL,
                [CreatedAtUtc] datetime2 NOT NULL,
                [CreatedBy] nvarchar(100) NULL,
                [LastModifiedAtUtc] datetime2 NULL,
                [LastModifiedBy] nvarchar(100) NULL,
                CONSTRAINT [PK_Invoices] PRIMARY KEY ([Id])
            );
            CREATE UNIQUE INDEX [IX_Invoices_CompanyId_InvoiceNumber] ON [inv].[Invoices] ([CompanyId], [InvoiceNumber]);

            CREATE TABLE [inv].[InvoiceLines] (
                [Id] uniqueidentifier NOT NULL,
                [TenantId] uniqueidentifier NOT NULL,
                [InvoiceId] uniqueidentifier NOT NULL,
                [LineNumber] int NOT NULL,
                [ItemNameAr] nvarchar(250) NOT NULL,
                [ItemNameEn] nvarchar(250) NULL,
                [Quantity] decimal(18,4) NOT NULL,
                [UnitPrice] decimal(18,4) NOT NULL,
                [SubTotal] decimal(18,4) NOT NULL,
                [Discount] decimal(18,4) NOT NULL,
                [TaxableAmount] decimal(18,4) NOT NULL,
                [VatRate] decimal(18,4) NOT NULL,
                [VatAmount] decimal(18,4) NOT NULL,
                [TotalAmount] decimal(18,4) NOT NULL,
                CONSTRAINT [PK_InvoiceLines] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_InvoiceLines_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [inv].[Invoices] ([Id]) ON DELETE CASCADE
            );
        ");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Database initialization warning: {Message}", ex.Message);
    }
}

app.Run();
