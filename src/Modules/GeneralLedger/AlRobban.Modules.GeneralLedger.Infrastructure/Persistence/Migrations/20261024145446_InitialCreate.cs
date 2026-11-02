using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "gl");

            migrationBuilder.CreateTable(
                name: "Accounts",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ParentAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Level = table.Column<int>(type: "int", nullable: false),
                    AccountType = table.Column<int>(type: "int", nullable: false),
                    AccountNature = table.Column<int>(type: "int", nullable: false),
                    FinancialStatement = table.Column<int>(type: "int", nullable: false),
                    IsPostable = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "SAR"),
                    CurrentBalance = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false, defaultValue: 0m),
                    Guidance = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Accounts_Accounts_ParentAccountId",
                        column: x => x.ParentAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BusinessPartners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PartnerType = table.Column<int>(type: "int", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TaxNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CommercialRegistration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StreetName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BuildingNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PlotIdentification = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CitySubdivisionName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CityName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PostalZone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OtherIdType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OtherIdValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreditLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentTermsDays = table.Column<int>(type: "int", nullable: false),
                    GlAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CurrentBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessPartners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CompanyFinancialSettings",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DefaultCurrency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "SAR"),
                    CalendarType = table.Column<int>(type: "int", nullable: false),
                    CostCenterPolicy = table.Column<int>(type: "int", nullable: false),
                    AllowBackdatedEntries = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    MaxBackdatedDays = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    RequireApprovalForEntries = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Include13thClosingPeriod = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyFinancialSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CostCenters",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ParentCostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostCenters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CostCenters_CostCenters_ParentCostCenterId",
                        column: x => x.ParentCostCenterId,
                        principalSchema: "gl",
                        principalTable: "CostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CurrencyRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrencyNameAr = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrencyNameEn = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExchangeRateToSar = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrencyRates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FinancialStatementSettings",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IncomeStatementFormat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "multi-step"),
                    DefaultHideZeroBalances = table.Column<bool>(type: "bit", nullable: false),
                    DefaultLevelDepth = table.Column<int>(type: "int", nullable: true),
                    RetainedEarningsAccountCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "32102"),
                    ShowComparativePeriod = table.Column<bool>(type: "bit", nullable: false),
                    ShowSignaturesBlock = table.Column<bool>(type: "bit", nullable: false),
                    DecimalPlaces = table.Column<int>(type: "int", nullable: false, defaultValue: 2),
                    AccountingBasis = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "accrual"),
                    AllowDraftSimulation = table.Column<bool>(type: "bit", nullable: false),
                    CashFlowMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "indirect"),
                    CashAccountPrefix = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "111"),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialStatementSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FiscalYears",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    YearNumber = table.Column<int>(type: "int", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsClosed = table.Column<bool>(type: "bit", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FiscalYears", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PostDatedChecks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CheckNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BankName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DrawerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    BankAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PartnerAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedJournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BounceReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BounceFee = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostDatedChecks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecurringJournalEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DescriptionAr = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DescriptionEn = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Frequency = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextRunDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastRunDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExecutionCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringJournalEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BankReconciliations",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BankAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReconciliationNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StatementDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StatementEndingBalance = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BookBalance = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ClearedDeposits = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ClearedWithdrawals = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Difference = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReconciledAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReconciledBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankReconciliations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankReconciliations_Accounts_BankAccountId",
                        column: x => x.BankAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FixedAssets",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AssetAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccumulatedDepreciationAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepreciationExpenseAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PurchaseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepreciationStartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AcquisitionCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SalvageValue = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    UsefulLifeMonths = table.Column<int>(type: "int", nullable: false),
                    DepreciationMethod = table.Column<int>(type: "int", nullable: false),
                    DepreciationRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    CurrentBookValue = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAccumulatedDepreciation = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    LastDepreciationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FixedAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FixedAssets_Accounts_AccumulatedDepreciationAccountId",
                        column: x => x.AccumulatedDepreciationAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FixedAssets_Accounts_AssetAccountId",
                        column: x => x.AssetAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FixedAssets_Accounts_DepreciationExpenseAccountId",
                        column: x => x.DepreciationExpenseAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FixedAssets_CostCenters_CostCenterId",
                        column: x => x.CostCenterId,
                        principalSchema: "gl",
                        principalTable: "CostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "FiscalPeriods",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PeriodNumber = table.Column<int>(type: "int", nullable: false),
                    PeriodNameAr = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PeriodNameEn = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsClosingPeriod = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FiscalPeriods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FiscalPeriods_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalSchema: "gl",
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecurringJournalEntryLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecurringEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Debit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Credit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringJournalEntryLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringJournalEntryLines_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecurringJournalEntryLines_CostCenters_CostCenterId",
                        column: x => x.CostCenterId,
                        principalSchema: "gl",
                        principalTable: "CostCenters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RecurringJournalEntryLines_RecurringJournalEntries_RecurringEntryId",
                        column: x => x.RecurringEntryId,
                        principalTable: "RecurringJournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BankReconciliationItems",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BankReconciliationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JournalEntryLineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Debit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Credit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsMatched = table.Column<bool>(type: "bit", nullable: false),
                    MatchedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankReconciliationItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankReconciliationItems_BankReconciliations_BankReconciliationId",
                        column: x => x.BankReconciliationId,
                        principalSchema: "gl",
                        principalTable: "BankReconciliations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssetDepreciationHistories",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FixedAssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepreciationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodNumber = table.Column<int>(type: "int", nullable: false),
                    FiscalYear = table.Column<int>(type: "int", nullable: false),
                    DepreciationAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BookValueBefore = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BookValueAfter = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    JournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetDepreciationHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetDepreciationHistories_FixedAssets_FixedAssetId",
                        column: x => x.FixedAssetId,
                        principalSchema: "gl",
                        principalTable: "FixedAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JournalEntries",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EntryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FiscalPeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DescriptionAr = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DescriptionEn = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    TotalDebit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCredit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReversedEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReversalReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PostedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PostedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalEntries_FiscalPeriods_FiscalPeriodId",
                        column: x => x.FiscalPeriodId,
                        principalSchema: "gl",
                        principalTable: "FiscalPeriods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JournalEntryLines",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Debit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Credit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalEntryLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalEntryLines_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JournalEntryLines_CostCenters_CostCenterId",
                        column: x => x.CostCenterId,
                        principalSchema: "gl",
                        principalTable: "CostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JournalEntryLines_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalSchema: "gl",
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vouchers",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoucherType = table.Column<int>(type: "int", nullable: false),
                    VoucherNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    VoucherDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FiscalPeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PaymentMethod = table.Column<int>(type: "int", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CashOrBankAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BeneficiaryOrPayerName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PostedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CancelledAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vouchers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vouchers_Accounts_CashOrBankAccountId",
                        column: x => x.CashOrBankAccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Vouchers_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalSchema: "gl",
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VoucherLines",
                schema: "gl",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoucherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VoucherLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VoucherLines_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalSchema: "gl",
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VoucherLines_CostCenters_CostCenterId",
                        column: x => x.CostCenterId,
                        principalSchema: "gl",
                        principalTable: "CostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VoucherLines_Vouchers_VoucherId",
                        column: x => x.VoucherId,
                        principalSchema: "gl",
                        principalTable: "Vouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_ParentAccountId",
                schema: "gl",
                table: "Accounts",
                column: "ParentAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_TenantId_CompanyId_AccountCode",
                schema: "gl",
                table: "Accounts",
                columns: new[] { "TenantId", "CompanyId", "AccountCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssetDepreciationHistories_FixedAssetId",
                schema: "gl",
                table: "AssetDepreciationHistories",
                column: "FixedAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_BankReconciliationItems_BankReconciliationId",
                schema: "gl",
                table: "BankReconciliationItems",
                column: "BankReconciliationId");

            migrationBuilder.CreateIndex(
                name: "IX_BankReconciliations_BankAccountId",
                schema: "gl",
                table: "BankReconciliations",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyFinancialSettings_TenantId_CompanyId",
                schema: "gl",
                table: "CompanyFinancialSettings",
                columns: new[] { "TenantId", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CostCenters_ParentCostCenterId",
                schema: "gl",
                table: "CostCenters",
                column: "ParentCostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_CostCenters_TenantId_CompanyId_Code",
                schema: "gl",
                table: "CostCenters",
                columns: new[] { "TenantId", "CompanyId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementSettings_TenantId_CompanyId",
                schema: "gl",
                table: "FinancialStatementSettings",
                columns: new[] { "TenantId", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FiscalPeriods_FiscalYearId",
                schema: "gl",
                table: "FiscalPeriods",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_FiscalPeriods_TenantId_CompanyId_FiscalYearId_PeriodNumber",
                schema: "gl",
                table: "FiscalPeriods",
                columns: new[] { "TenantId", "CompanyId", "FiscalYearId", "PeriodNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FiscalYears_TenantId_CompanyId_YearNumber",
                schema: "gl",
                table: "FiscalYears",
                columns: new[] { "TenantId", "CompanyId", "YearNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_AccumulatedDepreciationAccountId",
                schema: "gl",
                table: "FixedAssets",
                column: "AccumulatedDepreciationAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_AssetAccountId",
                schema: "gl",
                table: "FixedAssets",
                column: "AssetAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_CostCenterId",
                schema: "gl",
                table: "FixedAssets",
                column: "CostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_DepreciationExpenseAccountId",
                schema: "gl",
                table: "FixedAssets",
                column: "DepreciationExpenseAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_FiscalPeriodId",
                schema: "gl",
                table: "JournalEntries",
                column: "FiscalPeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_TenantId_CompanyId_EntryNumber",
                schema: "gl",
                table: "JournalEntries",
                columns: new[] { "TenantId", "CompanyId", "EntryNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntryLines_AccountId",
                schema: "gl",
                table: "JournalEntryLines",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntryLines_CostCenterId",
                schema: "gl",
                table: "JournalEntryLines",
                column: "CostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntryLines_JournalEntryId",
                schema: "gl",
                table: "JournalEntryLines",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringJournalEntryLines_AccountId",
                table: "RecurringJournalEntryLines",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringJournalEntryLines_CostCenterId",
                table: "RecurringJournalEntryLines",
                column: "CostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringJournalEntryLines_RecurringEntryId",
                table: "RecurringJournalEntryLines",
                column: "RecurringEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_VoucherLines_AccountId",
                schema: "gl",
                table: "VoucherLines",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_VoucherLines_CostCenterId",
                schema: "gl",
                table: "VoucherLines",
                column: "CostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_VoucherLines_VoucherId",
                schema: "gl",
                table: "VoucherLines",
                column: "VoucherId");

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_CashOrBankAccountId",
                schema: "gl",
                table: "Vouchers",
                column: "CashOrBankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_JournalEntryId",
                schema: "gl",
                table: "Vouchers",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_TenantId_CompanyId_VoucherNumber",
                schema: "gl",
                table: "Vouchers",
                columns: new[] { "TenantId", "CompanyId", "VoucherNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetDepreciationHistories",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "BankReconciliationItems",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "BusinessPartners");

            migrationBuilder.DropTable(
                name: "CompanyFinancialSettings",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "CurrencyRates");

            migrationBuilder.DropTable(
                name: "FinancialStatementSettings",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "JournalEntryLines",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "PostDatedChecks");

            migrationBuilder.DropTable(
                name: "RecurringJournalEntryLines");

            migrationBuilder.DropTable(
                name: "VoucherLines",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "FixedAssets",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "BankReconciliations",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "RecurringJournalEntries");

            migrationBuilder.DropTable(
                name: "Vouchers",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "CostCenters",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "Accounts",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "JournalEntries",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "FiscalPeriods",
                schema: "gl");

            migrationBuilder.DropTable(
                name: "FiscalYears",
                schema: "gl");
        }
    }
}
