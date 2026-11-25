import { supabaseAdmin } from "../../Shared/database/banco.js";

export async function DeleteAccount(
  userId: string,
  jwt: string,
): Promise<"forbidden" | "blocked" | "deleted" | "error"> {
  const { data: userData, error: userError } = await supabaseAdmin
    .from("perfis")
    .update({ status: "EXCLUIDO" })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (userError) {
    console.error("Erro ao atualizar status do usuário:", userError);
    return "error";
  }

  if (!userData) {
    return "forbidden";
  }

  const { error: signoutError } = await supabaseAdmin.auth.admin.signOut(
    jwt,
    "global",
  );
  if (signoutError) {
    console.error("Erro ao desconectar usuário:", signoutError);
    return "error";
  }

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      ban_duration: "876000h",
    },
  );
  if (banError) {
    console.error("Erro ao banir usuário:", banError);
    return "error";
  }

  return "deleted";
}

export async function CheckPassword(
  userId: string,
  password: string,
): Promise<"invalid_password" | "valid" | "error"> {

  const { data: isValid, error } = await supabaseAdmin.rpc(
    "verify_user_password",
    {
      user_id: userId,
      current_password: password,
    },
  );
  if (error) {
    return "error";
  }

  if (!isValid) {
    return "invalid_password";
  }

  return "valid";
}