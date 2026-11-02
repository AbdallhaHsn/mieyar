using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "inv");

            migrationBuilder.CreateTable(
                name: "Invoices",
                schema: "inv",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Uuid = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssueTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    InvoiceType = table.Column<int>(type: "int", nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CustomerVatNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CustomerCrNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SalespersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SalespersonName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceInvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReferenceInvoiceNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModificationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalDiscount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalTaxableAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalVat = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentStatus = table.Column<int>(type: "int", nullable: false),
                    PreviousInvoiceHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InvoiceHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CryptographicStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    QrCodePayload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AssociatedJournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedJournalEntryNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Salespersons",
                schema: "inv",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    WarehouseNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CommissionRate = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Salespersons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceLines",
                schema: "inv",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ItemNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemNameEn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    VatRate = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    VatAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceLines_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalSchema: "inv",
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLines_InvoiceId",
                schema: "inv",
                table: "InvoiceLines",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_CompanyId_InvoiceNumber",
                schema: "inv",
                table: "Invoices",
                columns: new[] { "CompanyId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Salespersons_CompanyId_Code",
                schema: "inv",
                table: "Salespersons",
                columns: new[] { "CompanyId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceLines",
                schema: "inv");

            migrationBuilder.DropTable(
                name: "Salespersons",
                schema: "inv");

            migrationBuilder.DropTable(
                name: "Invoices",
                schema: "inv");
        }
    }
}
