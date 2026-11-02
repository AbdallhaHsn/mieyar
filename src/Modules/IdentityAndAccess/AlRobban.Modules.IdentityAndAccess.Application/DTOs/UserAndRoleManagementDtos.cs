using AlRobban.Modules.IdentityAndAccess.Domain.Enums;

namespace AlRobban.Modules.IdentityAndAccess.Application.DTOs;

public record CompanyUserDto(
    Guid Id,
    Guid? TenantId,
    string UserName,
    string Email,
    string FullNameAr,
    string FullNameEn,
    string? PhoneNumber,
    UserRole Role,
    string RoleNameAr,
    string RoleNameEn,
    Guid? CompanyRoleId,
    string? CompanyRoleCode,
    string? CompanyRoleNameAr,
    string? CompanyRoleNameEn,
    Guid? BranchId,
    string? BranchNameAr,
    string? BranchNameEn,
    bool IsActive,
    DateTime? LastLoginUtc,
    DateTime CreatedAtUtc
);

public record CreateCompanyUserRequest(
    string UserName,
    string Email,
    string Password,
    string FullNameAr,
    string FullNameEn,
    string? PhoneNumber,
    UserRole Role = UserRole.Accountant,
    Guid? CompanyRoleId = null,
    Guid? BranchId = null
);

public record UpdateCompanyUserRequest(
    string FullNameAr,
    string FullNameEn,
    string? PhoneNumber,
    UserRole Role,
    Guid? CompanyRoleId,
    Guid? BranchId,
    bool IsActive
);

public record ResetUserPasswordRequest(
    string NewPassword
);

public record ToggleUserStatusRequest(
    bool IsActive
);

public record CompanyRoleDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string NameAr,
    string NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    bool IsSystemRole,
    List<string> Permissions,
    int AssignedUsersCount,
    DateTime CreatedAtUtc
);

public record CreateRoleRequest(
    string Code,
    string NameAr,
    string NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    List<string> Permissions
);

public record UpdateRoleRequest(
    string NameAr,
    string NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    List<string> Permissions
);

public record PermissionItemDto(
    string Key,
    string LabelAr,
    string LabelEn,
    string DescriptionAr,
    string DescriptionEn
);

public record PermissionModuleDto(
    string ModuleKey,
    string ModuleNameAr,
    string ModuleNameEn,
    string Icon,
    List<PermissionItemDto> Permissions
);
