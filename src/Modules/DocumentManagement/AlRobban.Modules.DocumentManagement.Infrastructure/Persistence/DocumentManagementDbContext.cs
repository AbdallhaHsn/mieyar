using AlRobban.Modules.DocumentManagement.Application.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.DocumentManagement.Infrastructure.Persistence;

public class DocumentManagementDbContext : AppDbContextBase
{
    public DbSet<DocumentAttachment> Documents => Set<DocumentAttachment>();

    public DocumentManagementDbContext(
        DbContextOptions<DocumentManagementDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DocumentAttachment>(entity =>
        {
            entity.ToTable("DocumentAttachments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(250);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FileContentBase64).IsRequired();
            entity.HasIndex(e => new { e.CompanyId, e.EntityType, e.EntityId });
        });

        base.OnModelCreating(modelBuilder);
    }
}
