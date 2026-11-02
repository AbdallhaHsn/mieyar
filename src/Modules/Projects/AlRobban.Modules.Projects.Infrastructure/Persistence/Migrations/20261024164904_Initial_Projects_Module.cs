using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.Projects.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Initial_Projects_Module : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "proj");

            migrationBuilder.CreateTable(
                name: "Projects",
                schema: "proj",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CostCenterName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ContractNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContractDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpectedEndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActualEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContractAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRate = table.Column<decimal>(type: "decimal(6,4)", precision: 6, scale: 4, nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RetentionPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    AdvancePaymentAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AdvancePaymentDeductionPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CompletionPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    ProjectManager = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SiteLocation = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContractProgressBillings",
                schema: "proj",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BillingNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BillingSequence = table.Column<int>(type: "int", nullable: false),
                    BillingDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PreviousWorkAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrentWorkAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RetentionPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    RetentionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AdvancePaymentDeduction = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OtherDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DeductionsNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NetAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRate = table.Column<decimal>(type: "decimal(6,4)", precision: 6, scale: 4, nullable: false),
                    VatAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalWithVat = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ConsultantName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ConsultantApprovalDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConsultantNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AssociatedInvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedInvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AssociatedJournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedJournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractProgressBillings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractProgressBillings_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "proj",
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LettersOfGuarantee",
                schema: "proj",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuaranteeNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    IssuingBank = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    BankBranch = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    BankAccountNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    BeneficiaryName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CashMarginPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    CashMarginAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    BankCommission = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AssociatedJournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedJournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LettersOfGuarantee", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LettersOfGuarantee_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "proj",
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectExpenses",
                schema: "proj",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PhaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExpenseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SupplierOrWorkerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ReferenceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectExpenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectExpenses_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "proj",
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectPhases",
                schema: "proj",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhaseOrder = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    WeightPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    CompletionPercentage = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectPhases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectPhases_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "proj",
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractProgressBillings_CompanyId_ProjectId_BillingNumber",
                schema: "proj",
                table: "ContractProgressBillings",
                columns: new[] { "CompanyId", "ProjectId", "BillingNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractProgressBillings_ProjectId",
                schema: "proj",
                table: "ContractProgressBillings",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_LettersOfGuarantee_CompanyId_GuaranteeNumber",
                schema: "proj",
                table: "LettersOfGuarantee",
                columns: new[] { "CompanyId", "GuaranteeNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_LettersOfGuarantee_ProjectId",
                schema: "proj",
                table: "LettersOfGuarantee",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectExpenses_CompanyId_ProjectId",
                schema: "proj",
                table: "ProjectExpenses",
                columns: new[] { "CompanyId", "ProjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectExpenses_ProjectId",
                schema: "proj",
                table: "ProjectExpenses",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPhases_ProjectId",
                schema: "proj",
                table: "ProjectPhases",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CompanyId_Code",
                schema: "proj",
                table: "Projects",
                columns: new[] { "CompanyId", "Code" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractProgressBillings",
                schema: "proj");

            migrationBuilder.DropTable(
                name: "LettersOfGuarantee",
                schema: "proj");

            migrationBuilder.DropTable(
                name: "ProjectExpenses",
                schema: "proj");

            migrationBuilder.DropTable(
                name: "ProjectPhases",
                schema: "proj");

            migrationBuilder.DropTable(
                name: "Projects",
                schema: "proj");
        }
    }
}
