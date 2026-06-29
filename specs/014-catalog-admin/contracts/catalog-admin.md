# API Contract: Catalog Admin (014)

**Base**: `/api/v1/branches/{branchId}/catalog`  
**Auth**: `Authorization: Bearer <JWT>` (exceto GET público já existente)

## Categories (admin)

### GET `/categories?includeInactive=1`

Response `200`:

```json
{
  "categories": [
    { "id": "uuid", "name": "Burgers", "sort_order": 1, "is_active": true }
  ]
}
```

### POST `/categories`

Body:

```json
{ "name": "Porções", "sortOrder": 3, "isActive": true }
```

### PATCH `/categories/{categoryId}`

Body parcial: `name`, `sortOrder`, `isActive`

### DELETE `/categories/{categoryId}`

- `409` se categoria contém produtos (MVP)

## Products (admin)

### GET `/products?includeUnavailable=1`

Response inclui `is_available`, `image_url`, etc.

### POST `/products`

```json
{
  "categoryId": "uuid",
  "name": "Pizza Calabresa",
  "description": "Massa fina",
  "priceCents": 4500,
  "isAvailable": true
}
```

### PATCH `/products/{productId}`

Campos parciais + `imageUrl: null` para remover foto.

### DELETE `/products/{productId}`

Soft preferível (`isAvailable: false`) ou hard delete se sem pedidos — definir em tasks.

## Image upload

### POST `/products/{productId}/image/presign`

Body:

```json
{ "contentType": "image/jpeg", "contentLength": 245000 }
```

Response `200`:

```json
{
  "uploadUrl": "https://...",
  "publicUrl": "https://cdn.../tenants/.../photo.webp",
  "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" }
}
```

Cliente faz PUT → depois PATCH product com `imageUrl: publicUrl`.

## Errors

| Code | error |
|------|-------|
| 400 | validation_error, invalid_image |
| 401 | unauthorized |
| 403 | forbidden (cross-tenant / branch) |
| 404 | not_found |
| 409 | category_has_products |
