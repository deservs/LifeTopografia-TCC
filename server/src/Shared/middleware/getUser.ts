import type { User } from "@supabase/supabase-js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../database/banco.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User;
  }
}
type GetUserResponse =
  { ok: true; user: User } | { ok: false; message: string };

export async function getUser(jwt: string): Promise<GetUserResponse> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getUser(jwt);
  if (sessionError || !sessionData.user) {
    return {
      ok: false,
      message: sessionError
        ? sessionError.message
        : "Falha ao obter os dados do usuário autenticado.",
    };
  }
  return {
    ok: true,
    user: sessionData.user,
  };
}

export default async function getUserFromRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
   if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ ok: false, message: "JWT não fornecido." });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return reply.status(401).send({ ok: false, message: "JWT inválido." });
  }
  const userResponse = await getUser(token);
  if (!userResponse.ok) {
    request.log.warn(userResponse.message);
    return reply.status(401).send({ ok: false, message: "Sessão inválida ou expirada." });
  }
  request.user = userResponse.user;
}
