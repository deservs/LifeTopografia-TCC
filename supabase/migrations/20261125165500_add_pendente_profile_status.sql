-- Adiciona o status PENDENTE para membros convidados por empresas antes da ativação da conta.
ALTER TYPE "public"."status_perfil_enum" ADD VALUE IF NOT EXISTS 'PENDENTE';
