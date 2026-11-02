using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWarehouseStocksAndInventoryTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WarehouseCode",
                schema: "pur",
                table: "InventoryTransactions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                schema: "pur",
                table: "InventoryTransactions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ItemWarehouseStocks",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    MinStockLevel = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    MaxStockLevel = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BinLocation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastMovementAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemWarehouseStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemWarehouseStocks_Items_ItemId",
                        column: x => x.ItemId,
                        principalSchema: "pur",
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItemWarehouseStocks_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_CompanyId_WarehouseId",
                schema: "pur",
                table: "InventoryTransactions",
                columns: new[] { "CompanyId", "WarehouseId" });

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseStocks_CompanyId_ItemId",
                schema: "pur",
                table: "ItemWarehouseStocks",
                columns: new[] { "CompanyId", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseStocks_CompanyId_WarehouseId_ItemId",
                schema: "pur",
                table: "ItemWarehouseStocks",
                columns: new[] { "CompanyId", "WarehouseId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseStocks_ItemId",
                schema: "pur",
                table: "ItemWarehouseStocks",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemWarehouseStocks_WarehouseId",
                schema: "pur",
                table: "ItemWarehouseStocks",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemWarehouseStocks",
                schema: "pur");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_CompanyId_WarehouseId",
                schema: "pur",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "WarehouseCode",
                schema: "pur",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                schema: "pur",
                table: "InventoryTransactions");
        }
    }
}
