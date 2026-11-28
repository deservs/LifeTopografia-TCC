import { randomInt, createHash, timingSafeEqual } from "crypto";
import { env } from "../../config/env.js";
import { supabaseAdmin } from "../../Shared/database/banco.js";

function gerarHash(userId: string, codigo: string): string {
  const hash = createHash("sha256");
  hash.update(`${userId}:${codigo}:${env.OTP_SECRET_PEPPER}`);
  return hash.digest("hex");
}

function verificarHash(hashBanco: string, hashUser: string): boolean {
  const bufA = Buffer.from(hashBanco, "hex");
  const bufB = Buffer.from(hashUser, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function gerarCodigoOTP(userId: string): Promise<string> {
  await supabaseAdmin
    .from("codigo_acesso")
    .update({
      usado: true,
    })
    .eq("user_id", userId)
    .eq("usado", false);

  const codigoPleno = randomInt(100000, 1000000).toString();

  const { error } = await supabaseAdmin.from("codigo_acesso").insert({
    user_id: userId,
    codigo_hash: gerarHash(userId, codigoPleno),
    expira_em: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    tentativas: 0,
    usado: false,
    criado_em: new Date().toISOString(),
  });
  if (error) {
    throw new Error(`Erro ao gerar código OTP: ${error.message}`);
  }
  return codigoPleno;
}

export async function verificarCooldownOTP(
  userId: string,
  cooldownSeconds = 60,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { data: ultimoRegistro, error } = await supabaseAdmin
    .from("codigo_acesso")
    .select("criado_em")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao verificar cooldown OTP: ${error.message}`);
  }

  if (!ultimoRegistro?.criado_em) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const elapsedMs = Date.now() - new Date(ultimoRegistro.criado_em).getTime();
  const cooldownMs = cooldownSeconds * 1000;

  if (elapsedMs < cooldownMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.min(
        cooldownSeconds,
        Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000)),
      ),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function verificarCodigoOTP(
  userId: string,
  codigo: string,
): Promise<boolean> {
  const { data: registro, error } = await supabaseAdmin
    .from("codigo_acesso")
    .select("id,codigo_hash,expira_em,tentativas")
    .eq("user_id", userId)
    .eq("usado", false)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !registro) {
    return false;
  }

  if (new Date(registro.expira_em) < new Date() || registro.tentativas >= 3) {
    await supabaseAdmin
      .from("codigo_acesso")
      .update({ usado: true })
      .eq("id", registro.id)
      .eq("usado", false);
    return false;
  }

  const hashUser = gerarHash(userId, codigo.trim());
  const valido = verificarHash(registro.codigo_hash, hashUser);

  if (!valido) {
    const tentativasAtualizadas = registro.tentativas + 1;
    await supabaseAdmin
      .from("codigo_acesso")
      .update({
        tentativas: tentativasAtualizadas,
        usado: tentativasAtualizadas >= 3,
      })
      .eq("id", registro.id)
      .eq("usado", false);
    return false;
  }

  const { data: consumed, error: consumeError } = await supabaseAdmin
    .from("codigo_acesso")
    .update({ usado: true })
    .eq("id", registro.id)
    .eq("usado", false)
    .select("id")
    .maybeSingle();

  if (consumeError || !consumed) {
    return false;
  }

  return true;
}
