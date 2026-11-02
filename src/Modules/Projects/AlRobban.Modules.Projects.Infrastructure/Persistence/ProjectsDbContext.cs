using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Projects.Infrastructure.Persistence;

public class ProjectsDbContext : AppDbContextBase
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectPhase> ProjectPhases => Set<ProjectPhase>();
    public DbSet<ContractProgressBilling> ContractProgressBillings => Set<ContractProgressBilling>();
    public DbSet<LetterOfGuarantee> LettersOfGuarantee => Set<LetterOfGuarantee>();
    public DbSet<ProjectExpense> ProjectExpenses => Set<ProjectExpense>();

    public ProjectsDbContext(
        DbContextOptions<ProjectsDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("proj");

        // Project Configuration
        modelBuilder.Entity<Project>(b =>
        {
            b.ToTable("Projects");
            b.HasKey(p => p.Id);
            b.Property(p => p.Code).HasMaxLength(50).IsRequired();
            b.Property(p => p.NameAr).HasMaxLength(250).IsRequired();
            b.Property(p => p.NameEn).HasMaxLength(250);
            b.Property(p => p.CustomerName).HasMaxLength(250).IsRequired();
            b.Property(p => p.ContractNumber).HasMaxLength(100);
            b.Property(p => p.CostCenterName).HasMaxLength(250);
            b.Property(p => p.ProjectManager).HasMaxLength(150);
            b.Property(p => p.SiteLocation).HasMaxLength(250);

            b.Property(p => p.ContractAmount).HasPrecision(18, 2);
            b.Property(p => p.VatRate).HasPrecision(6, 4);
            b.Property(p => p.EstimatedCost).HasPrecision(18, 2);
            b.Property(p => p.RetentionPercentage).HasPrecision(6, 2);
            b.Property(p => p.AdvancePaymentAmount).HasPrecision(18, 2);
            b.Property(p => p.AdvancePaymentDeductionPercentage).HasPrecision(6, 2);
            b.Property(p => p.CompletionPercentage).HasPrecision(6, 2);

            b.HasMany(p => p.Phases).WithOne().HasForeignKey(ph => ph.ProjectId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(p => p.Billings).WithOne().HasForeignKey(bl => bl.ProjectId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(p => p.Guarantees).WithOne().HasForeignKey(g => g.ProjectId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(p => p.Expenses).WithOne().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(p => new { p.CompanyId, p.Code });
        });

        // Project Phase Configuration
        modelBuilder.Entity<ProjectPhase>(b =>
        {
            b.ToTable("ProjectPhases");
            b.HasKey(ph => ph.Id);
            b.Property(ph => ph.NameAr).HasMaxLength(200).IsRequired();
            b.Property(ph => ph.NameEn).HasMaxLength(200);
            b.Property(ph => ph.EstimatedCost).HasPrecision(18, 2);
            b.Property(ph => ph.WeightPercentage).HasPrecision(6, 2);
            b.Property(ph => ph.CompletionPercentage).HasPrecision(6, 2);
        });

        // Contract Progress Billing Configuration
        modelBuilder.Entity<ContractProgressBilling>(b =>
        {
            b.ToTable("ContractProgressBillings");
            b.HasKey(bl => bl.Id);
            b.Property(bl => bl.BillingNumber).HasMaxLength(50).IsRequired();
            b.Property(bl => bl.ConsultantName).HasMaxLength(150);
            b.Property(bl => bl.AssociatedInvoiceNumber).HasMaxLength(50);
            b.Property(bl => bl.AssociatedJournalEntryNumber).HasMaxLength(50);

            b.Property(bl => bl.PreviousWorkAmount).HasPrecision(18, 2);
            b.Property(bl => bl.CurrentWorkAmount).HasPrecision(18, 2);
            b.Property(bl => bl.RetentionPercentage).HasPrecision(6, 2);
            b.Property(bl => bl.RetentionAmount).HasPrecision(18, 2);
            b.Property(bl => bl.AdvancePaymentDeduction).HasPrecision(18, 2);
            b.Property(bl => bl.OtherDeductions).HasPrecision(18, 2);
            b.Property(bl => bl.NetAmount).HasPrecision(18, 2);
            b.Property(bl => bl.VatRate).HasPrecision(6, 4);
            b.Property(bl => bl.VatAmount).HasPrecision(18, 2);
            b.Property(bl => bl.TotalWithVat).HasPrecision(18, 2);

            b.HasIndex(bl => new { bl.CompanyId, bl.ProjectId, bl.BillingNumber });
        });

        // Letter of Guarantee Configuration
        modelBuilder.Entity<LetterOfGuarantee>(b =>
        {
            b.ToTable("LettersOfGuarantee");
            b.HasKey(g => g.Id);
            b.Property(g => g.GuaranteeNumber).HasMaxLength(100).IsRequired();
            b.Property(g => g.IssuingBank).HasMaxLength(150).IsRequired();
            b.Property(g => g.BankBranch).HasMaxLength(150);
            b.Property(g => g.BankAccountNumber).HasMaxLength(50);
            b.Property(g => g.BeneficiaryName).HasMaxLength(250).IsRequired();
            b.Property(g => g.AssociatedJournalEntryNumber).HasMaxLength(50);

            b.Property(g => g.Amount).HasPrecision(18, 2);
            b.Property(g => g.CashMarginPercentage).HasPrecision(6, 2);
            b.Property(g => g.CashMarginAmount).HasPrecision(18, 2);
            b.Property(g => g.BankCommission).HasPrecision(18, 2);

            b.HasIndex(g => new { g.CompanyId, g.GuaranteeNumber });
        });

        // Project Expense Configuration
        modelBuilder.Entity<ProjectExpense>(b =>
        {
            b.ToTable("ProjectExpenses");
            b.HasKey(e => e.Id);
            b.Property(e => e.Description).HasMaxLength(300).IsRequired();
            b.Property(e => e.SupplierOrWorkerName).HasMaxLength(200);
            b.Property(e => e.ReferenceType).HasMaxLength(50);
            b.Property(e => e.ReferenceNumber).HasMaxLength(50);
            b.Property(e => e.Amount).HasPrecision(18, 2);

            b.HasIndex(e => new { e.CompanyId, e.ProjectId });
        });

        base.OnModelCreating(modelBuilder);
    }
}
