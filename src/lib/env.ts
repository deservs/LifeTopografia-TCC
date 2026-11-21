import { z } from "zod";

export const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ message: "URL do Supabase é obrigatória" })
    .url("URL do Supabase inválida"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string({ message: "Chave publicável do Supabase é obrigatória" })
    .min(1, "Chave publicável do Supabase é obrigatória"),
  VITE_MERCADO_PAGO_PUBLIC_KEY: z
    .string({ message: "Chave pública do Mercado Pago é obrigatória" })
    .min(1, "Chave pública do Mercado Pago é obrigatória"),
});

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
  if (import.meta.env.DEV) {
    console.warn(
      "⚠️ [Aviso de Ambiente]: Variáveis ausentes ou inválidas no .env.\n",
      _env.error.format(),
    );
  } else {
    console.error("Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error(
      "Variáveis de ambiente inválidas. Verifique o console para mais detalhes.",
    );
  }
}

export const env = _env.success
  ? _env.data
  : {
      VITE_SUPABASE_URL: "https://placeholder-project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "placeholder-anon-key",
      VITE_MERCADO_PAGO_PUBLIC_KEY: "placeholder-public-key",
    };
