-- Remove vínculos duplicados preservando o registro mais antigo de cada par (empresa_id, funcionario_id).
DELETE FROM public.membros_empresa
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY empresa_id, funcionario_id
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.membros_empresa
  ) sub
  WHERE sub.rn > 1
);

-- Garante unicidade do vínculo entre empresa e funcionário no banco de dados.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membros_empresa_empresa_funcionario_key'
      AND conrelid = 'public.membros_empresa'::regclass
  ) THEN
    ALTER TABLE "public"."membros_empresa"
      ADD CONSTRAINT "membros_empresa_empresa_funcionario_key"
      UNIQUE ("empresa_id", "funcionario_id");
  END IF;
END
$$;
