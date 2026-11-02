using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Add_Pos_Module : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CashReceived",
                schema: "inv",
                table: "Invoices",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ChangeGiven",
                schema: "inv",
                table: "Invoices",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PaymentMethod",
                schema: "inv",
                table: "Invoices",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PosShiftId",
                schema: "inv",
                table: "Invoices",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PosTerminalCode",
                schema: "inv",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PosShifts",
                schema: "inv",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CashierUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CashierName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TerminalCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    WarehouseName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OpenedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    OpeningFloatCash = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCashSales = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalMadaSales = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCreditCardSales = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalTaxAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    InvoiceCount = table.Column<int>(type: "int", nullable: false),
                    TotalCashIn = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCashOut = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ActualClosingCash = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    VarianceAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ClosingNotes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    JournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosShifts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PosCashMovements",
                schema: "inv",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PosShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MovementType = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReasonAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ReasonEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosCashMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PosCashMovements_PosShifts_PosShiftId",
                        column: x => x.PosShiftId,
                        principalSchema: "inv",
                        principalTable: "PosShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PosCashMovements_PosShiftId",
                schema: "inv",
                table: "PosCashMovements",
                column: "PosShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_PosShifts_CompanyId_ShiftNumber",
                schema: "inv",
                table: "PosShifts",
                columns: new[] { "CompanyId", "ShiftNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PosCashMovements",
                schema: "inv");

            migrationBuilder.DropTable(
                name: "PosShifts",
                schema: "inv");

            migrationBuilder.DropColumn(
                name: "CashReceived",
                schema: "inv",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ChangeGiven",
                schema: "inv",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                schema: "inv",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PosShiftId",
                schema: "inv",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PosTerminalCode",
                schema: "inv",
                table: "Invoices");
        }
    }
}
