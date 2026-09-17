-- Second layer of tenant isolation on top of application-level tenant_id filtering.
-- The API sets `SET LOCAL app.tenant_id = '<uuid>'` at the start of every request
-- transaction (see apps/api/src/plugins/tenant-context.ts); every business table's
-- rows are then only visible/writable when they match that setting.

-- felhasznalok is intentionally NOT RLS-protected like the other tables: logging in
-- and registering both need to look a user up by email alone, before any tenant_id
-- is known, so the API's DB role must be able to read across tenants on this one
-- table. Every other query against it (post-auth user management) still filters by
-- tenant_id explicitly at the application layer.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ugyfelek', 'jarmuvek', 'munkalapok',
    'alkatreszek', 'idopontok', 'szamlak', 'ertesitesek'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      tbl
    );
  END LOOP;
END $$;

-- munkalap_tetelek has no direct tenant_id; scope it through its parent munkalap.
ALTER TABLE munkalap_tetelek ENABLE ROW LEVEL SECURITY;
ALTER TABLE munkalap_tetelek FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON munkalap_tetelek USING (
  munkalap_id IN (
    SELECT id FROM munkalapok WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
  )
) WITH CHECK (
  munkalap_id IN (
    SELECT id FROM munkalapok WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
  )
);
