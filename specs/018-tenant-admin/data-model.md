# Data Model: 018-tenant-admin

## Existing

| Entity | Notes |
|--------|--------|
| Tenant | `status`: active \| suspended \| cancelled (string) |
| Company | `trade_name`, `legal_name`, `document_number` |
| Branch | `name`, `address`, `is_active`, `timezone` |
| User | `role`, `is_active`, unique (tenant_id, email) |
| UserBranchAccess | N:N user↔branch |

## Change

| Table | Change |
|-------|--------|
| `companies` | ADD `phone TEXT NULL` |

Sem novas tabelas. Create tenant preenche `document_number`, `phone`, `branches.address`.
