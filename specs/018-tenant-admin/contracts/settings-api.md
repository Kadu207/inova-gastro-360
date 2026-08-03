# Contracts: settings + admin tenants (018)

## Admin (super_admin)

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/api/v1/admin/tenants` | Lista `{ tenants: [{ id, name, slug, status, createdAt }] }` |
| POST | `/api/v1/admin/tenants` | CreateTenantSchema (+ documentNumber, phone, branchAddress) |
| PATCH | `/api/v1/admin/tenants/:id` | `{ status: "active"\|"suspended"\|"cancelled" }` |

## Settings (admin_cliente | super_admin no próprio tid; super_admin só via admin routes para outros)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/settings/company` | Company do `user.tid` |
| PATCH | `/api/v1/settings/company` | tradeName, legalName, documentNumber, phone |
| GET | `/api/v1/settings/branches` | Filiais do tenant |
| POST | `/api/v1/settings/branches` | name, address?, timezone? |
| PATCH | `/api/v1/settings/branches/:id` | name, address, isActive, timezone |
| GET | `/api/v1/settings/users` | Users + branchIds |
| POST | `/api/v1/settings/users` | name, email, password, role, branchIds[] |
| PATCH | `/api/v1/settings/users/:id` | name, role, isActive, branchIds?, password? |

Roles permitidos em settings writes: `admin_cliente`, `super_admin` (scoped ao JWT tid).
