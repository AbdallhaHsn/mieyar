using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "pur");

            migrationBuilder.CreateTable(
                name: "GoodsReceiptNotes",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PurchaseOrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    DeliveryNoteNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReceiptDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReceiverName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    InspectorName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TotalReceivedValue = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsInventoryUpdated = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_GoodsReceiptNotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Items",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    NameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemType = table.Column<int>(type: "int", nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SalePrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CostPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    InventoryAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CogsAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RevenueAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CurrentStockQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    MinStockLevel = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseInvoices",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    VendorInvoiceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    VendorVatNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    VendorCrNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ExchangeRateToSar = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalDiscount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalTaxableAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalVat = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaymentStatus = table.Column<int>(type: "int", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PurchaseOrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    GoodsReceiptNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    GoodsReceiptNoteNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MatchingStatus = table.Column<int>(type: "int", nullable: false),
                    AssociatedJournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssociatedJournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseInvoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrders",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RequisitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RequisitionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    VendorVatNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    VendorCrNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpectedDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaymentTerms = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ExchangeRateToSar = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BranchCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalDiscount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalTaxableAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalVat = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitions",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequisitionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RequesterName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RequestDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RequiredByDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProjectCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ApprovalNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TotalEstimatedAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ConvertedToPoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConvertedToPoNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Warehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ManagerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ManagerPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Warehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GoodsReceiptNoteLines",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GoodsReceiptNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    PurchaseOrderLineId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ItemNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    QuantityOrdered = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityReceived = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityAccepted = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityRejected = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    RejectionReason = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    UnitCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsReceiptNoteLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoodsReceiptNoteLines_GoodsReceiptNotes_GoodsReceiptNoteId",
                        column: x => x.GoodsReceiptNoteId,
                        principalSchema: "pur",
                        principalTable: "GoodsReceiptNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventoryTransactions",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MovementType = table.Column<int>(type: "int", nullable: false),
                    QuantityIn = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityOut = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BalanceAfterQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryTransactions_Items_ItemId",
                        column: x => x.ItemId,
                        principalSchema: "pur",
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseInvoiceLines",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseInvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ItemNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    VatRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    VatAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseInvoiceLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLines_Items_ItemId",
                        column: x => x.ItemId,
                        principalSchema: "pur",
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLines_PurchaseInvoices_PurchaseInvoiceId",
                        column: x => x.PurchaseInvoiceId,
                        principalSchema: "pur",
                        principalTable: "PurchaseInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderLines",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ItemNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    QuantityOrdered = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityReceived = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityBilled = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    VatRate = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderLines_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalSchema: "pur",
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionLines",
                schema: "pur",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequisitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineNumber = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ItemNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    QuantityRequested = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    EstimatedUnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    WarehouseCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionLines_PurchaseRequisitions_RequisitionId",
                        column: x => x.RequisitionId,
                        principalSchema: "pur",
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceiptNoteLines_GoodsReceiptNoteId",
                schema: "pur",
                table: "GoodsReceiptNoteLines",
                column: "GoodsReceiptNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_CompanyId_ItemId",
                schema: "pur",
                table: "InventoryTransactions",
                columns: new[] { "CompanyId", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_CompanyId_TransactionDate",
                schema: "pur",
                table: "InventoryTransactions",
                columns: new[] { "CompanyId", "TransactionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_ItemId",
                schema: "pur",
                table: "InventoryTransactions",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Items_CompanyId_Barcode",
                schema: "pur",
                table: "Items",
                columns: new[] { "CompanyId", "Barcode" },
                unique: true,
                filter: "[Barcode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Items_CompanyId_ItemCode",
                schema: "pur",
                table: "Items",
                columns: new[] { "CompanyId", "ItemCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLines_ItemId",
                schema: "pur",
                table: "PurchaseInvoiceLines",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLines_PurchaseInvoiceId",
                schema: "pur",
                table: "PurchaseInvoiceLines",
                column: "PurchaseInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoices_CompanyId_InvoiceNumber",
                schema: "pur",
                table: "PurchaseInvoices",
                columns: new[] { "CompanyId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoices_CompanyId_IssueDate",
                schema: "pur",
                table: "PurchaseInvoices",
                columns: new[] { "CompanyId", "IssueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoices_CompanyId_VendorId",
                schema: "pur",
                table: "PurchaseInvoices",
                columns: new[] { "CompanyId", "VendorId" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLines_PurchaseOrderId",
                schema: "pur",
                table: "PurchaseOrderLines",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionLines_RequisitionId",
                schema: "pur",
                table: "PurchaseRequisitionLines",
                column: "RequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_TenantId_CompanyId_Code",
                table: "Warehouses",
                columns: new[] { "TenantId", "CompanyId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoodsReceiptNoteLines",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "InventoryTransactions",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseInvoiceLines",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseOrderLines",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionLines",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "Warehouses");

            migrationBuilder.DropTable(
                name: "GoodsReceiptNotes",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "Items",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseInvoices",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseOrders",
                schema: "pur");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitions",
                schema: "pur");
        }
    }
}
