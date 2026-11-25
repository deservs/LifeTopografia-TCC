-- Protege colunas sensíveis de public.perfis contra alteração direta por clientes públicos.
-- Alterações de tipo_perfil, status e cnpj devem ocorrer exclusivamente via service_role no backend.

DROP POLICY IF EXISTS "Editar próprio perfil" ON "public"."perfis";

CREATE POLICY "Editar próprio perfil" ON "public"."perfis"
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

REVOKE UPDATE ON TABLE "public"."perfis" FROM "anon", "authenticated";
GRANT UPDATE (nome_ou_razao, email, foto_url) ON TABLE "public"."perfis" TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."trg_protect_perfis_sensitive_columns"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  IF (current_user IN ('authenticated', 'anon') OR jwt_role IN ('authenticated', 'anon'))
     AND current_user <> 'service_role' THEN
    IF NEW.tipo_perfil IS DISTINCT FROM OLD.tipo_perfil
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.cnpj IS DISTINCT FROM OLD.cnpj THEN
      RAISE EXCEPTION 'Alteração direta de tipo_perfil, status ou cnpj não permitida.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_protect_perfis_sensitive_columns ON "public"."perfis";

CREATE TRIGGER trigger_protect_perfis_sensitive_columns
  BEFORE UPDATE ON "public"."perfis"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."trg_protect_perfis_sensitive_columns"();
