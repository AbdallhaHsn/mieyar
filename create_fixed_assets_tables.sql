IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FixedAssets' AND schema_id = SCHEMA_ID('gl'))
BEGIN
    CREATE TABLE gl.FixedAssets (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        CompanyId UNIQUEIDENTIFIER NOT NULL,
        AssetCode NVARCHAR(50) NOT NULL,
        NameAr NVARCHAR(200) NOT NULL,
        NameEn NVARCHAR(200) NOT NULL,
        AssetAccountId UNIQUEIDENTIFIER NOT NULL,
        AccumulatedDepreciationAccountId UNIQUEIDENTIFIER NOT NULL,
        DepreciationExpenseAccountId UNIQUEIDENTIFIER NOT NULL,
        CostCenterId UNIQUEIDENTIFIER NULL,
        PurchaseDate DATETIME2 NOT NULL,
        DepreciationStartDate DATETIME2 NOT NULL,
        AcquisitionCost DECIMAL(18, 4) NOT NULL,
        SalvageValue DECIMAL(18, 4) NOT NULL DEFAULT 0,
        UsefulLifeMonths INT NOT NULL,
        DepreciationMethod INT NOT NULL DEFAULT 1,
        DepreciationRate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        CurrentBookValue DECIMAL(18, 4) NOT NULL,
        TotalAccumulatedDepreciation DECIMAL(18, 4) NOT NULL DEFAULT 0,
        LastDepreciationDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 1,
        SerialNumber NVARCHAR(100) NULL,
        Location NVARCHAR(200) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
        CONSTRAINT FK_FixedAssets_AssetAccount FOREIGN KEY (AssetAccountId) REFERENCES gl.Accounts(Id),
        CONSTRAINT FK_FixedAssets_AccumAccount FOREIGN KEY (AccumulatedDepreciationAccountId) REFERENCES gl.Accounts(Id),
        CONSTRAINT FK_FixedAssets_ExpenseAccount FOREIGN KEY (DepreciationExpenseAccountId) REFERENCES gl.Accounts(Id)
    );

    CREATE INDEX IX_FixedAssets_CompanyId ON gl.FixedAssets(CompanyId);
    CREATE INDEX IX_FixedAssets_AssetCode ON gl.FixedAssets(AssetCode);
    CREATE INDEX IX_FixedAssets_Status ON gl.FixedAssets(Status);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetDepreciationHistories' AND schema_id = SCHEMA_ID('gl'))
BEGIN
    CREATE TABLE gl.AssetDepreciationHistories (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        FixedAssetId UNIQUEIDENTIFIER NOT NULL,
        DepreciationDate DATETIME2 NOT NULL,
        PeriodNumber INT NOT NULL,
        FiscalYear INT NOT NULL,
        DepreciationAmount DECIMAL(18, 4) NOT NULL,
        BookValueBefore DECIMAL(18, 4) NOT NULL,
        BookValueAfter DECIMAL(18, 4) NOT NULL,
        JournalEntryId UNIQUEIDENTIFIER NULL,
        JournalEntryNumber NVARCHAR(50) NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
        CONSTRAINT FK_DepHistories_Asset FOREIGN KEY (FixedAssetId) REFERENCES gl.FixedAssets(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_DepHistories_AssetId ON gl.AssetDepreciationHistories(FixedAssetId);
    CREATE INDEX IX_DepHistories_Date ON gl.AssetDepreciationHistories(DepreciationDate);
END
