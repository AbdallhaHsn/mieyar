using AlRobban.Modules.DocumentManagement.Infrastructure.Persistence;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using AlRobban.Modules.Manufacturing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage;

namespace AlRobban.WebAPI.Startup;

/// <summary>
/// Applies EF Core migrations for every module DbContext at startup (fail-fast: any failure aborts startup).
///
/// Databases created before migrations existed ("legacy": tables present, no __EFMigrationsHistory rows)
/// are *baselined*: the existing migrations are recorded as applied without executing them, so no table is recreated.
/// Fresh databases are built entirely by migrations.
/// Disable with configuration Database:AutoMigrate=false (e.g. when migrations are applied by a deployment pipeline).
/// </summary>
public static class DatabaseMigrator
{
    public static async Task MigrateDatabasesAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue("Database:AutoMigrate", true))
        {
            Serilog.Log.Information("Database:AutoMigrate is disabled; skipping automatic migrations.");
            return;
        }

        using var scope = app.Services.CreateScope();
        var sp = scope.ServiceProvider;

        // Order matters only for logging; each context owns its own schema/tables.
        await MigrateAsync(sp.GetRequiredService<IdentityAndAccessDbContext>());
        await MigrateAsync(sp.GetRequiredService<GeneralLedgerDbContext>());
        await MigrateAsync(sp.GetRequiredService<InvoicingDbContext>());
        await MigrateAsync(sp.GetRequiredService<PurchasingDbContext>());
        await MigrateAsync(sp.GetRequiredService<DocumentManagementDbContext>());
        await MigrateAsync(sp.GetRequiredService<HumanResourcesDbContext>());
        await MigrateAsync(sp.GetRequiredService<ProjectsDbContext>());
        await MigrateAsync(sp.GetRequiredService<ManufacturingDbContext>());
        await EnsureExtendedTablesExistAsync(sp);

        // 8. Auto-seed initial platform admin, tenant company, and master data if fresh
        // The platform owner must never be bound to a company (older databases may have it linked to a demo tenant).
        var identity = sp.GetRequiredService<IdentityAndAccessDbContext>();
        var unbound = await identity.Users.IgnoreQueryFilters()
            .Where(u => u.Role == AlRobban.Modules.IdentityAndAccess.Domain.Enums.UserRole.SuperAdmin && u.TenantId != null)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.TenantId, (Guid?)null));
        if (unbound > 0) Serilog.Log.Information("Unbound {Count} SuperAdmin user(s) from tenant companies.", unbound);

        await SeedDefaultDataAsync(sp);
    }

    private static async Task MigrateAsync(DbContext db)
    {
        var name = db.GetType().Name;
        var all = db.Database.GetMigrations().ToList();
        if (all.Count == 0)
        {
            if (await db.Database.CanConnectAsync() && !await HasLegacyTablesAsync(db))
            {
                var creator = db.GetService<IRelationalDatabaseCreator>();
                await creator.CreateTablesAsync();
                Serilog.Log.Information("{Context}: created schema and tables automatically via RelationalDatabaseCreator.", name);
                return;
            }
            Serilog.Log.Warning("{Context}: no migrations found in assembly; skipped.", name);
            return;
        }

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();

        if (applied.Count == 0 && await db.Database.CanConnectAsync() && await HasLegacyTablesAsync(db))
        {
            await BaselineAsync(db, all);
            Serilog.Log.Information("{Context}: legacy database detected; baselined {Count} migration(s) without executing them.", name, all.Count);
            return;
        }

        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            Serilog.Log.Information("{Context}: database is up to date.", name);
            return;
        }

        Serilog.Log.Information("{Context}: applying {Count} pending migration(s): {Migrations}", name, pending.Count, string.Join(", ", pending));
        await db.Database.MigrateAsync();
    }

    /// <summary>True when at least one table of this context's model already exists (pre-migrations database).</summary>
    private static async Task<bool> HasLegacyTablesAsync(DbContext db)
    {
        foreach (var entity in db.Model.GetEntityTypes())
        {
            var table = entity.GetTableName();
            if (table is null) continue;
            var schema = entity.GetSchema() ?? "dbo";

            var exists = (await db.Database
                .SqlQuery<int>($"SELECT COUNT(*) AS [Value] FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = {schema} AND TABLE_NAME = {table}")
                .ToListAsync()).FirstOrDefault();

            if (exists > 0) return true;
        }

        return false;
    }

    private static Task BaselineAsync(DbContext db, IEnumerable<string> migrationIds)
    {
        var history = db.GetService<IHistoryRepository>();

        var historySchema = db.GetService<IDbContextOptions>().Extensions
            .OfType<RelationalOptionsExtension>().FirstOrDefault()?.MigrationsHistoryTableSchema;
        if (!string.IsNullOrWhiteSpace(historySchema))
        {
            // Schema name comes from our own DI configuration (not user input).
            db.Database.ExecuteSqlRaw($"IF SCHEMA_ID(N'{historySchema}') IS NULL EXEC(N'CREATE SCHEMA [{historySchema}]');");
        }

        db.Database.ExecuteSqlRaw(history.GetCreateIfNotExistsScript());

        var productVersion = typeof(DbContext).Assembly.GetName().Version?.ToString(3) ?? "8.0.10";
        foreach (var id in migrationIds)
        {
            var script = history.GetInsertScript(new HistoryRow(id, productVersion));
            db.Database.ExecuteSqlRaw(script);
        }

        return Task.CompletedTask;
    }

    private static async Task EnsureExtendedTablesExistAsync(IServiceProvider sp)
    {
        try
        {
            var identityDb = sp.GetRequiredService<IdentityAndAccessDbContext>();
            const string sql = @"
IF SCHEMA_ID(N'proj') IS NULL EXEC(N'CREATE SCHEMA [proj]');
IF SCHEMA_ID(N'pur') IS NULL EXEC(N'CREATE SCHEMA [pur]');

IF OBJECT_ID(N'[proj].[ProjectPlanningTasks]', N'U') IS NULL
BEGIN
    CREATE TABLE [proj].[ProjectPlanningTasks] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [CompanyId] uniqueidentifier NOT NULL,
        [ProjectId] uniqueidentifier NOT NULL,
        [ProjectName] nvarchar(250) NOT NULL DEFAULT N'',
        [ProjectCode] nvarchar(50) NOT NULL DEFAULT N'',
        [PhaseId] uniqueidentifier NULL,
        [TitleAr] nvarchar(300) NOT NULL,
        [TitleEn] nvarchar(300) NOT NULL DEFAULT N'',
        [StartDate] nvarchar(30) NOT NULL DEFAULT N'',
        [EndDate] nvarchar(30) NOT NULL DEFAULT N'',
        [DurationDays] int NOT NULL DEFAULT 30,
        [ProgressPercentage] decimal(6,2) NOT NULL DEFAULT 0,
        [AssignedTo] nvarchar(150) NOT NULL DEFAULT N'',
        [AssignedRole] nvarchar(150) NOT NULL DEFAULT N'',
        [IsMilestone] bit NOT NULL DEFAULT 0,
        [Status] nvarchar(50) NOT NULL DEFAULT N'Planned',
        [PredecessorId] nvarchar(100) NULL,
        [EstimatedCost] decimal(18,2) NOT NULL DEFAULT 0,
        [Notes] nvarchar(max) NULL,
        [CreatedAtUtc] datetime2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX [IX_ProjectPlanningTasks_CompanyId_ProjectId] ON [proj].[ProjectPlanningTasks] ([CompanyId], [ProjectId]);
END

IF OBJECT_ID(N'[proj].[ProjectTimesheets]', N'U') IS NULL
BEGIN
    CREATE TABLE [proj].[ProjectTimesheets] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [CompanyId] uniqueidentifier NOT NULL,
        [ProjectId] uniqueidentifier NOT NULL,
        [ProjectName] nvarchar(250) NOT NULL DEFAULT N'',
        [ProjectCode] nvarchar(50) NOT NULL DEFAULT N'',
        [PhaseId] uniqueidentifier NULL,
        [PhaseName] nvarchar(250) NULL,
        [Date] nvarchar(30) NOT NULL DEFAULT N'',
        [EntryType] nvarchar(50) NOT NULL DEFAULT N'internal_labor',
        [UnitOfMeasure] nvarchar(50) NOT NULL DEFAULT N'hour',
        [Quantity] decimal(18,2) NOT NULL DEFAULT 0,
        [UnitPrice] decimal(18,2) NOT NULL DEFAULT 0,
        [EmployeeName] nvarchar(150) NOT NULL DEFAULT N'',
        [EmployeeRole] nvarchar(150) NOT NULL DEFAULT N'',
        [SubcontractorName] nvarchar(250) NULL,
        [SubcontractorContractNo] nvarchar(100) NULL,
        [RetentionPercentage] decimal(6,2) NOT NULL DEFAULT 0,
        [RetentionAmount] decimal(18,2) NOT NULL DEFAULT 0,
        [NetPayable] decimal(18,2) NOT NULL DEFAULT 0,
        [TaskDescription] nvarchar(500) NOT NULL DEFAULT N'',
        [Hours] decimal(18,2) NOT NULL DEFAULT 0,
        [HourlyRate] decimal(18,2) NOT NULL DEFAULT 0,
        [TotalCost] decimal(18,2) NOT NULL DEFAULT 0,
        [IsBillable] bit NOT NULL DEFAULT 1,
        [Status] nvarchar(50) NOT NULL DEFAULT N'Approved',
        [Notes] nvarchar(max) NULL,
        [CreatedAtUtc] datetime2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX [IX_ProjectTimesheets_CompanyId_ProjectId] ON [proj].[ProjectTimesheets] ([CompanyId], [ProjectId]);
END

IF OBJECT_ID(N'[proj].[ProjectAccountingSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [proj].[ProjectAccountingSettings] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [CompanyId] uniqueidentifier NOT NULL,
        [DefaultRetentionPercentage] decimal(6,2) NOT NULL DEFAULT 10,
        [DefaultAdvancePaymentPercentage] decimal(6,2) NOT NULL DEFAULT 20,
        [DefaultVatRate] decimal(6,2) NOT NULL DEFAULT 15,
        [RequireConsultantApproval] bit NOT NULL DEFAULT 1,
        [AutoPostProgressBillingToGl] bit NOT NULL DEFAULT 1,
        [AutoIssueTaxInvoiceOnApprove] bit NOT NULL DEFAULT 1,
        [AutoCreateProjectCostCenter] bit NOT NULL DEFAULT 1,
        [AlertGuaranteeExpiryDays] int NOT NULL DEFAULT 30,
        [ArAccountCode] nvarchar(50) NOT NULL DEFAULT N'11301',
        [ArAccountName] nvarchar(200) NOT NULL DEFAULT N'العملاء والمدينون التجاريون',
        [RetentionAccountCode] nvarchar(50) NOT NULL DEFAULT N'11303',
        [RetentionAccountName] nvarchar(200) NOT NULL DEFAULT N'تأمينات وضمان أعمال محتجزة',
        [AdvancePaymentAccountCode] nvarchar(50) NOT NULL DEFAULT N'21302',
        [AdvancePaymentAccountName] nvarchar(200) NOT NULL DEFAULT N'دفعات مقدمة من العملاء',
        [RevenueAccountCode] nvarchar(50) NOT NULL DEFAULT N'41103',
        [RevenueAccountName] nvarchar(200) NOT NULL DEFAULT N'إيرادات عقود ومشاريع مقاولات',
        [VatAccountCode] nvarchar(50) NOT NULL DEFAULT N'21201',
        [VatAccountName] nvarchar(200) NOT NULL DEFAULT N'ضريبة القيمة المضافة المحصلة (مخرجات 15%)',
        [GuaranteeMarginAccountCode] nvarchar(50) NOT NULL DEFAULT N'11204',
        [GuaranteeMarginAccountName] nvarchar(200) NOT NULL DEFAULT N'تأمينات نقدية لخطابات الضمان لدى البنوك',
        [GuaranteeCommissionAccountCode] nvarchar(50) NOT NULL DEFAULT N'53102',
        [GuaranteeCommissionAccountName] nvarchar(200) NOT NULL DEFAULT N'عمولات ومصاريف إصدار خطابات الضمان',
        [UpdatedAtUtc] datetime2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE UNIQUE INDEX [IX_ProjectAccountingSettings_CompanyId] ON [proj].[ProjectAccountingSettings] ([CompanyId]);
END

IF OBJECT_ID(N'[pur].[ItemCategories]', N'U') IS NULL
BEGIN
    CREATE TABLE [pur].[ItemCategories] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [CompanyId] uniqueidentifier NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [NameAr] nvarchar(200) NOT NULL,
        [NameEn] nvarchar(200) NOT NULL DEFAULT N'',
        [Description] nvarchar(500) NULL,
        [Color] nvarchar(50) NULL,
        [Icon] nvarchar(100) NULL,
        [IsActive] bit NOT NULL DEFAULT 1,
        [CreatedAtUtc] datetime2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX [IX_ItemCategories_CompanyId_Code] ON [pur].[ItemCategories] ([CompanyId], [Code]);
END

IF OBJECT_ID(N'[dbo].[SystemKeyValueStores]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SystemKeyValueStores] (
        [StoreKey] nvarchar(250) NOT NULL PRIMARY KEY,
        [JsonValue] nvarchar(max) NOT NULL,
        [UpdatedAtUtc] datetime2 NOT NULL DEFAULT GETUTCDATE()
    );
END

IF OBJECT_ID(N'[inv].[Salespersons]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[inv].[Salespersons]', N'DepartmentName') IS NULL
        ALTER TABLE [inv].[Salespersons] ADD [DepartmentName] nvarchar(150) NULL;
    IF COL_LENGTH(N'[inv].[Salespersons]', N'DepartmentNameEn') IS NULL
        ALTER TABLE [inv].[Salespersons] ADD [DepartmentNameEn] nvarchar(150) NULL;
END";
            await identityDb.Database.ExecuteSqlRawAsync(sql);
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning("EnsureExtendedTablesExistAsync warning: {Message}", ex.Message);
        }
    }

    private static async Task SeedDefaultDataAsync(IServiceProvider sp)
    {
        try
        {
            var identityDb = sp.GetRequiredService<IdentityAndAccessDbContext>();
            var passwordHasher = sp.GetRequiredService<AlRobban.Modules.IdentityAndAccess.Application.Services.IPasswordHasher>();

            var config = sp.GetRequiredService<IConfiguration>();
            var env = sp.GetRequiredService<IHostEnvironment>();
            // Demo data (well-known credentials + demo company) is for Development only unless explicitly enabled.
            var seedDemo = config.GetValue("Bootstrap:SeedDemoData", env.IsDevelopment());

            var hasUsers = await identityDb.Users.IgnoreQueryFilters().AnyAsync();
            if (!hasUsers && !seedDemo)
            {
                var bootstrapPassword = config["Bootstrap:SuperAdminPassword"];
                if (string.IsNullOrWhiteSpace(bootstrapPassword) || bootstrapPassword.Length < 12)
                {
                    Serilog.Log.Warning("No users exist and Bootstrap:SuperAdminPassword (>= 12 chars) is not configured; no administrator was created.");
                }
                else
                {
                    var bootstrapUserName = config["Bootstrap:SuperAdminUserName"] ?? "superadmin";
                    var bootstrapEmail = config["Bootstrap:SuperAdminEmail"] ?? "admin@localhost";
                    var firstAdmin = new AlRobban.Modules.IdentityAndAccess.Domain.Entities.User(
                        Guid.NewGuid(),
                        tenantId: null,
                        bootstrapUserName,
                        bootstrapEmail,
                        passwordHasher.HashPassword(bootstrapPassword),
                        "مدير النظام",
                        "System Administrator",
                        AlRobban.Modules.IdentityAndAccess.Domain.Enums.UserRole.SuperAdmin,
                        createdBy: "System Bootstrapper");
                    await identityDb.Users.AddAsync(firstAdmin);
                    await identityDb.SaveChangesAsync();
                    Serilog.Log.Information("Bootstrap SuperAdmin '{UserName}' created. Remove Bootstrap:SuperAdminPassword from configuration now.", bootstrapUserName);
                }
            }

            if (!seedDemo)
            {
                return;
            }

            if (!hasUsers)
            {
                Serilog.Log.Information("Initial platform startup: auto-seeding SuperAdmin, demo tenant company, and master data...");

                var tenantId = Guid.Parse("11111111-2222-3333-4444-555555555555");
                var address = new AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects.NationalAddress(
                    "طريق الملك فهد", "1234", "العليا", "الرياض", "12345", "6789", "SA");

                var defaultCompany = new AlRobban.Modules.IdentityAndAccess.Domain.Entities.Company(
                    tenantId,
                    "COMP-01",
                    "شركة مِعْيَــــار للحلول الذكية والمحاسبية",
                    "Meyar Smart Accounting Solutions Co.",
                    "310123456700003",
                    "1010789456",
                    "SAR",
                    address,
                    "/meyar-logo.jpg",
                    "#0f766e");

                defaultCompany.AddBranch(
                    "HQ-MAIN",
                    "الإدارة العامة والفرع الرئيسي - الرياض",
                    "Headquarters & Main Branch - Riyadh",
                    isMain: true,
                    branchAddress: address);

                defaultCompany.AddFiscalYear(
                    2026,
                    "السنة المالية 2026",
                    "Fiscal Year 2026",
                    new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Utc));

                await identityDb.Companies.AddAsync(defaultCompany);

                // 1. SuperAdmin (Platform Owner)
                var superAdmin = new AlRobban.Modules.IdentityAndAccess.Domain.Entities.User(
                    Guid.Parse("ca111111-1111-1111-1111-111111111111"),
                    tenantId: null, // Platform Owner
                    "admin",
                    "admin@alrobban.com",
                    passwordHasher.HashPassword("SuperAdmin@2026"),
                    "عبدالرحمن بن خالد المنصور",
                    "Abdulrahman Al-Mansoor",
                    AlRobban.Modules.IdentityAndAccess.Domain.Enums.UserRole.SuperAdmin,
                    phoneNumber: "0505123456",
                    createdBy: "System Bootstrapper");

                // 2. Tenant Admin (Company Admin)
                var tenantAdmin = new AlRobban.Modules.IdentityAndAccess.Domain.Entities.User(
                    Guid.Parse("ca222222-2222-2222-2222-222222222222"),
                    tenantId: tenantId,
                    "alkhaleej_admin",
                    "admin@meyar.sa",
                    passwordHasher.HashPassword("Tenant@2026"),
                    "محمد عبدالله السالم",
                    "Mohammed Al-Salem",
                    AlRobban.Modules.IdentityAndAccess.Domain.Enums.UserRole.CompanyAdmin,
                    phoneNumber: "0555654321",
                    createdBy: "System Bootstrapper");

                await identityDb.Users.AddRangeAsync(superAdmin, tenantAdmin);
                await identityDb.SaveChangesAsync();

                Serilog.Log.Information("Initial SuperAdmin and Tenant Admin created successfully.");
            }

            // Seed General Ledger defaults if needed
            var glDb = sp.GetRequiredService<GeneralLedgerDbContext>();
            var canonicalCompanyId = Guid.Parse("11111111-2222-3333-4444-555555555555");
            var hasGlAccounts = await glDb.Accounts.IgnoreQueryFilters().AnyAsync(a => a.CompanyId == canonicalCompanyId);
            if (!hasGlAccounts)
            {
                Serilog.Log.Information("Seeding default IFRS Chart of Accounts for canonical company...");
                var seedAccounts = AlRobban.Modules.GeneralLedger.Domain.Seeding.DefaultChartOfAccountsSeeder
                    .GenerateDefaultAccounts(canonicalCompanyId, canonicalCompanyId);
                await glDb.Accounts.AddRangeAsync(seedAccounts);

                var glSettings = AlRobban.Modules.GeneralLedger.Domain.Entities.CompanyFinancialSettings.CreateDefault(
                    canonicalCompanyId, canonicalCompanyId);
                await glDb.FinancialSettings.AddAsync(glSettings);

                var glYear = AlRobban.Modules.GeneralLedger.Domain.Entities.FiscalYear.Create(
                    canonicalCompanyId, canonicalCompanyId, 2026,
                    "السنة المالية 2026", "Fiscal Year 2026",
                    new DateTime(2026, 1, 1), new DateTime(2026, 12, 31),
                    includeClosingPeriod: true);
                await glDb.FiscalYears.AddAsync(glYear);

                await glDb.SaveChangesAsync();
                Serilog.Log.Information("Chart of Accounts and Financial Settings seeded successfully.");
            }

            // Seed Purchasing default warehouse if needed
            var purchasingDb = sp.GetRequiredService<PurchasingDbContext>();
            var hasWarehouse = await purchasingDb.Warehouses.IgnoreQueryFilters().AnyAsync(w => w.CompanyId == canonicalCompanyId);
            if (!hasWarehouse)
            {
                var defaultWh = new AlRobban.Modules.Purchasing.Domain.Entities.Warehouse(
                    Guid.NewGuid(),
                    canonicalCompanyId,
                    canonicalCompanyId,
                    code: "WH-MAIN",
                    nameAr: "المستودع الرئيسي (الإدارة)",
                    nameEn: "Main Central Warehouse",
                    branchId: Guid.Parse("ba111111-1111-1111-1111-111111111111"),
                    branchName: "الفرع الرئيسي",
                    location: "الرياض - المقر الرئيسي",
                    managerName: "أمين المستودع العام",
                    managerPhone: "0501234567",
                    isDefault: true);

                await purchasingDb.Warehouses.AddAsync(defaultWh);
                await purchasingDb.SaveChangesAsync();
                Serilog.Log.Information("Default warehouse seeded successfully.");
            }

            // Seed Manufacturing defaults if needed
            var mfgDb = sp.GetRequiredService<ManufacturingDbContext>();
            var hasBoms = await mfgDb.BillOfMaterials.IgnoreQueryFilters().AnyAsync(b => b.CompanyId == canonicalCompanyId);
            if (!hasBoms)
            {
                var ws1 = new AlRobban.Modules.Manufacturing.Domain.Entities.Workstation(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    Code = "WS-MIX-01",
                    NameAr = "محطة الخلط الآلي المركزي",
                    NameEn = "Central Automated Batching Plant",
                    Type = AlRobban.Modules.Manufacturing.Domain.Enums.WorkstationType.Machine,
                    HourlyCost = 150m,
                    CapacityPerDayHours = 12m,
                    EfficiencyPercentage = 96m,
                    Location = "المنطقة الصناعية - مجمع الخلط الرئيسي",
                    Status = AlRobban.Modules.Manufacturing.Domain.Enums.WorkstationStatus.Active
                };
                var ws2 = new AlRobban.Modules.Manufacturing.Domain.Entities.Workstation(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    Code = "WS-FORM-02",
                    NameAr = "خط تشكيل وصب الخرسانة والقوالب",
                    NameEn = "Concrete Forming & Molding Line",
                    Type = AlRobban.Modules.Manufacturing.Domain.Enums.WorkstationType.AssemblyLine,
                    HourlyCost = 95m,
                    CapacityPerDayHours = 8m,
                    EfficiencyPercentage = 92m,
                    Location = "ساحة الصب والتجفيف رقم 2",
                    Status = AlRobban.Modules.Manufacturing.Domain.Enums.WorkstationStatus.Active
                };
                await mfgDb.Workstations.AddRangeAsync(ws1, ws2);

                var raw1 = new AlRobban.Modules.Manufacturing.Domain.Entities.RawMaterial(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    ItemCode = "RAW-CEM-SRC",
                    NameAr = "إسمنت بورتلاندي مقاوم للأملاح SRC",
                    NameEn = "Sulfate Resistant Portland Cement SRC",
                    Category = AlRobban.Modules.Manufacturing.Domain.Enums.RawMaterialCategory.Concrete,
                    CategoryAr = "خرسانة ومواد خلط",
                    CategoryEn = "Concrete & Mixes",
                    UnitOfMeasure = "طن",
                    UnitCost = 280m,
                    CurrentStock = 120m,
                    WarehouseName = "مستودع المواد الخام والمخاليط",
                    MinStockLevel = 25m
                };
                var raw2 = new AlRobban.Modules.Manufacturing.Domain.Entities.RawMaterial(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    ItemCode = "RAW-AGG-10",
                    NameAr = "ركام وبحص مقاس 10 مم مغسول",
                    NameEn = "Washed Aggregate 10mm",
                    Category = AlRobban.Modules.Manufacturing.Domain.Enums.RawMaterialCategory.Concrete,
                    CategoryAr = "خرسانة ومواد خلط",
                    CategoryEn = "Concrete & Mixes",
                    UnitOfMeasure = "م³",
                    UnitCost = 45m,
                    CurrentStock = 450m,
                    WarehouseName = "مستودع المواد الخام والمخاليط",
                    MinStockLevel = 80m
                };
                var raw3 = new AlRobban.Modules.Manufacturing.Domain.Entities.RawMaterial(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    ItemCode = "RAW-SAND-01",
                    NameAr = "رمل سيليكا أبيض مغسول",
                    NameEn = "Washed White Silica Sand",
                    Category = AlRobban.Modules.Manufacturing.Domain.Enums.RawMaterialCategory.Concrete,
                    CategoryAr = "خرسانة ومواد خلط",
                    CategoryEn = "Concrete & Mixes",
                    UnitOfMeasure = "م³",
                    UnitCost = 35m,
                    CurrentStock = 600m,
                    WarehouseName = "مستودع المواد الخام والمخاليط",
                    MinStockLevel = 100m
                };
                await mfgDb.RawMaterials.AddRangeAsync(raw1, raw2, raw3);

                var bom = new AlRobban.Modules.Manufacturing.Domain.Entities.BillOfMaterials(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    Code = "BOM-CONC-C35",
                    NameAr = "شجرة خلطة خرسانية جاهزة مقاومة للأملاح C35",
                    NameEn = "Ready-Mix Concrete SRC C35 Formula",
                    FinishedProductId = "prd-001",
                    FinishedProductCode = "CONC-C35-M3",
                    FinishedProductNameAr = "خرسانة جاهزة مقاومة C35 (متر مكعب)",
                    FinishedProductNameEn = "Ready-Mix Sulfate Resistant Concrete C35",
                    OutputQuantity = 1m,
                    UnitOfMeasure = "م³ (متر مكعب)",
                    RawMaterialsWarehouseName = "مستودع المواد الخام والمخاليط",
                    FinishedGoodsWarehouseName = "ساحة التعبئة والتحميل المركزية",
                    Version = "1.2",
                    IsActive = true
                };
                bom.Components.Add(new AlRobban.Modules.Manufacturing.Domain.Entities.BomComponent(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    BomId = bom.Id,
                    ItemCode = "RAW-CEM-SRC",
                    ItemNameAr = "إسمنت بورتلاندي مقاوم للأملاح SRC",
                    ItemNameEn = "Sulfate Resistant Cement SRC",
                    QuantityRequired = 0.38m,
                    UnitOfMeasure = "طن",
                    ScrapPercentage = 2m,
                    UnitCost = 280m,
                    TotalCost = 108.53m
                });
                bom.Components.Add(new AlRobban.Modules.Manufacturing.Domain.Entities.BomComponent(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    BomId = bom.Id,
                    ItemCode = "RAW-AGG-10",
                    ItemNameAr = "ركام وبحص مقاس 10 مم مغسول",
                    ItemNameEn = "Washed Aggregate 10mm",
                    QuantityRequired = 0.72m,
                    UnitOfMeasure = "م³",
                    ScrapPercentage = 3m,
                    UnitCost = 45m,
                    TotalCost = 33.37m
                });
                bom.Components.Add(new AlRobban.Modules.Manufacturing.Domain.Entities.BomComponent(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    BomId = bom.Id,
                    ItemCode = "RAW-SAND-01",
                    ItemNameAr = "رمل سيليكا أبيض مغسول",
                    ItemNameEn = "Washed White Silica Sand",
                    QuantityRequired = 0.48m,
                    UnitOfMeasure = "م³",
                    ScrapPercentage = 2.5m,
                    UnitCost = 35m,
                    TotalCost = 17.22m
                });
                bom.Operations.Add(new AlRobban.Modules.Manufacturing.Domain.Entities.BomOperation(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    BomId = bom.Id,
                    OperationNameAr = "خلط ومعايرة المكونات آلياً",
                    OperationNameEn = "Automated Batching & Mixing",
                    WorkstationName = "محطة الخلط الآلي المركزي",
                    StandardTimeMinutes = 12m,
                    HourlyLaborRate = 45m,
                    HourlyOverheadRate = 60m,
                    TotalOperationCost = 21.00m
                });
                bom.RecalculateTotals();
                await mfgDb.BillOfMaterials.AddAsync(bom);

                var wo = new AlRobban.Modules.Manufacturing.Domain.Entities.WorkOrder(Guid.NewGuid())
                {
                    CompanyId = canonicalCompanyId,
                    WorkOrderNumber = "WO-2026-0001",
                    BomId = bom.Id,
                    BomCode = bom.Code,
                    FinishedProductId = bom.FinishedProductId,
                    FinishedProductCode = bom.FinishedProductCode,
                    FinishedProductNameAr = bom.FinishedProductNameAr,
                    FinishedProductNameEn = bom.FinishedProductNameEn,
                    PlannedQuantity = 50m,
                    CompletedQuantity = 20m,
                    RejectedQuantity = 0m,
                    UnitOfMeasure = bom.UnitOfMeasure,
                    StartDate = DateTime.UtcNow.Date.AddDays(-2),
                    DueDate = DateTime.UtcNow.Date.AddDays(3),
                    Status = AlRobban.Modules.Manufacturing.Domain.Enums.WorkOrderStatus.InProgress,
                    Priority = AlRobban.Modules.Manufacturing.Domain.Enums.WorkOrderPriority.High,
                    AssignedSupervisor = "م. خالد السبيعي (مدير خط الإنتاج)",
                    AssignedWorkstation = "محطة الخلط الآلي المركزي",
                    RawMaterialsWarehouseName = bom.RawMaterialsWarehouseName,
                    FinishedGoodsWarehouseName = bom.FinishedGoodsWarehouseName,
                    EstimatedTotalCost = bom.TotalUnitCost * 50m,
                    UnitActualCost = bom.TotalUnitCost,
                    Notes = "أمر تشغيل خرسانة مقاومة لتوريد مشروع برج الرياض"
                };
                await mfgDb.WorkOrders.AddAsync(wo);

                await mfgDb.SaveChangesAsync();
                Serilog.Log.Information("Manufacturing demo data seeded successfully.");
            }
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning("Non-fatal startup seeder notice: {Message}", ex.Message);
        }
    }
}
