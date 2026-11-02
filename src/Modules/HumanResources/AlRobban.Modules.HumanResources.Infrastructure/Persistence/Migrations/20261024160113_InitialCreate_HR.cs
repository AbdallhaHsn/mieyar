using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate_HR : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "hr");

            migrationBuilder.CreateTable(
                name: "Departments",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ManagerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FirstNameAr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastNameAr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FullNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    FirstNameEn = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastNameEn = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FullNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NationalIdOrIqama = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Nationality = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsSaudi = table.Column<bool>(type: "bit", nullable: false),
                    Gender = table.Column<int>(type: "int", nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DepartmentName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    JobTitleAr = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    JobTitleEn = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CostCenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HireDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ContractType = table.Column<int>(type: "int", nullable: false),
                    ContractStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContractEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    BankCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BankName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Iban = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BasicSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    HousingAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransportationAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OtherAllowances = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PayrollPeriods",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayrollNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PeriodYear = table.Column<int>(type: "int", nullable: false),
                    PeriodMonth = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    EmployeeCount = table.Column<int>(type: "int", nullable: false),
                    TotalBasicSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalHousingAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalTransportationAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalOtherAllowances = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalOvertime = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalGrossSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalEmployeeGosiDeduction = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCompanyGosiContribution = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAbsenceDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalLoanDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalOtherDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalNetSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    JournalEntryNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PostedToGlAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WpsExportedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WpsFileName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollPeriods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PayrollLines",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayrollPeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EmployeeNameAr = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    EmployeeNameEn = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    NationalIdOrIqama = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BankCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Iban = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BasicSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    HousingAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransportationAllowance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OtherAllowances = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OvertimeAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    EmployeeGosiDeduction = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CompanyGosiContribution = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AbsenceDeduction = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LoanDeduction = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OtherDeductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayrollLines_PayrollPeriods_PayrollPeriodId",
                        column: x => x.PayrollPeriodId,
                        principalSchema: "hr",
                        principalTable: "PayrollPeriods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Departments_TenantId_CompanyId_Code",
                schema: "hr",
                table: "Departments",
                columns: new[] { "TenantId", "CompanyId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_TenantId_CompanyId_EmployeeNumber",
                schema: "hr",
                table: "Employees",
                columns: new[] { "TenantId", "CompanyId", "EmployeeNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_TenantId_CompanyId_NationalIdOrIqama",
                schema: "hr",
                table: "Employees",
                columns: new[] { "TenantId", "CompanyId", "NationalIdOrIqama" });

            migrationBuilder.CreateIndex(
                name: "IX_PayrollLines_PayrollPeriodId",
                schema: "hr",
                table: "PayrollLines",
                column: "PayrollPeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollPeriods_TenantId_CompanyId_PeriodYear_PeriodMonth",
                schema: "hr",
                table: "PayrollPeriods",
                columns: new[] { "TenantId", "CompanyId", "PeriodYear", "PeriodMonth" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Departments",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Employees",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "PayrollLines",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "PayrollPeriods",
                schema: "hr");
        }
    }
}
