-- Spec 015 follow-up — bootstrap RLS para inova_gastro_app (login, cardápio público, provisionamento).
-- O owner inova_gastro ignora RLS; a role da API precisa de caminhos explícitos sem tenant context.

CREATE OR REPLACE FUNCTION app_has_tenant_context() RETURNS boolean AS $$
  SELECT app_current_tenant_id() IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Login: busca usuário sem vazar outros tenants (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION app_find_users_for_login(p_email text, p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  email text,
  name text,
  role text,
  password_hash text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, u.is_active
  FROM users u
  WHERE lower(u.email) = lower(p_email)
    AND (p_tenant_id IS NULL OR u.tenant_id = p_tenant_id)
  ORDER BY u.created_at ASC
  LIMIT 2;
$$;

CREATE OR REPLACE FUNCTION app_find_active_user_by_id(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  email text,
  name text,
  role text,
  password_hash text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, u.is_active
  FROM users u
  WHERE u.id = p_user_id AND u.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION app_find_users_for_login(text, uuid) TO inova_gastro_app;
GRANT EXECUTE ON FUNCTION app_find_active_user_by_id(uuid) TO inova_gastro_app;

-- tenants: slug lookup (login) + provisionamento super_admin
DROP POLICY IF EXISTS tenants_tenant_isolation ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (status = 'active' AND (NOT app_has_tenant_context() OR id = app_current_tenant_id()));
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (NOT app_has_tenant_context());
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id = app_current_tenant_id()) WITH CHECK (id = app_current_tenant_id());
CREATE POLICY tenants_delete ON tenants FOR DELETE
  USING (id = app_current_tenant_id());

-- branches: cardápio público resolve tenant pela filial
DROP POLICY IF EXISTS branches_tenant_isolation ON branches;
CREATE POLICY branches_select ON branches FOR SELECT
  USING (is_active = true AND (NOT app_has_tenant_context() OR tenant_id = app_current_tenant_id()));
CREATE POLICY branches_write ON branches FOR INSERT
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY branches_update ON branches FOR UPDATE
  USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY branches_delete ON branches FOR DELETE
  USING (tenant_id = app_current_tenant_id());

-- Cardápio público (sem contexto): somente itens de filiais ativas.
DROP POLICY IF EXISTS product_categories_tenant_isolation ON product_categories;
CREATE POLICY product_categories_select ON product_categories FOR SELECT
  USING (
    is_active = true
    AND (tenant_id = app_current_tenant_id() OR NOT app_has_tenant_context())
    AND EXISTS (
      SELECT 1 FROM branches b
      WHERE b.id = product_categories.branch_id
        AND b.is_active = true
        AND b.tenant_id = product_categories.tenant_id
    )
  );
CREATE POLICY product_categories_write ON product_categories FOR INSERT
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY product_categories_update ON product_categories FOR UPDATE
  USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY product_categories_delete ON product_categories FOR DELETE
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_select ON products FOR SELECT
  USING (
    (tenant_id = app_current_tenant_id() OR (NOT app_has_tenant_context() AND is_available = true))
    AND EXISTS (
      SELECT 1 FROM branches b
      WHERE b.id = products.branch_id
        AND b.is_active = true
        AND b.tenant_id = products.tenant_id
    )
  );
CREATE POLICY products_write ON products FOR INSERT
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY products_update ON products FOR UPDATE
  USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY products_delete ON products FOR DELETE
  USING (tenant_id = app_current_tenant_id());

-- users: leitura apenas com contexto (login usa SECURITY DEFINER)
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_select ON users FOR SELECT
  USING (tenant_id = app_current_tenant_id());
CREATE POLICY users_write ON users FOR INSERT
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY users_update ON users FOR UPDATE
  USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY users_delete ON users FOR DELETE
  USING (tenant_id = app_current_tenant_id());
