using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyLicense : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: some databases already received the Users.BranchId / Users.CompanyRoleId /
            // CompanyRoles objects outside of migrations, so every step is guarded.
            migrationBuilder.Sql(@"
IF COL_LENGTH('Users','BranchId') IS NULL ALTER TABLE [Users] ADD [BranchId] uniqueidentifier NULL;
IF COL_LENGTH('Users','CompanyRoleId') IS NULL ALTER TABLE [Users] ADD [CompanyRoleId] uniqueidentifier NULL;
ALTER TABLE [Companies] ALTER COLUMN [LogoUrl] nvarchar(max) NULL;
IF COL_LENGTH('Companies','LicenseExpiresAtUtc') IS NULL ALTER TABLE [Companies] ADD [LicenseExpiresAtUtc] datetime2 NULL;
IF COL_LENGTH('Companies','MaxBranches') IS NULL ALTER TABLE [Companies] ADD [MaxBranches] int NULL;
IF COL_LENGTH('Companies','MaxUsers') IS NULL ALTER TABLE [Companies] ADD [MaxUsers] int NULL;
IF COL_LENGTH('Companies','MaxWarehouses') IS NULL ALTER TABLE [Companies] ADD [MaxWarehouses] int NULL;
IF OBJECT_ID(N'[CompanyRoles]') IS NULL
BEGIN
    CREATE TABLE [CompanyRoles] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [NameAr] nvarchar(150) NOT NULL,
        [NameEn] nvarchar(150) NOT NULL,
        [DescriptionAr] nvarchar(250) NULL,
        [DescriptionEn] nvarchar(250) NULL,
        [IsSystemRole] bit NOT NULL,
        [PermissionsJson] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [LastModifiedAtUtc] datetime2 NULL,
        [LastModifiedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_CompanyRoles] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_CompanyRoles_TenantId_Code] ON [CompanyRoles] ([TenantId], [Code]);
END
");
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanyRoles");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CompanyRoleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LicenseExpiresAtUtc",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "MaxBranches",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "MaxUsers",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "MaxWarehouses",
                table: "Companies");

            migrationBuilder.AlterColumn<string>(
                name: "LogoUrl",
                table: "Companies",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
