import { z } from "zod";

type CNPJValidationResult = | { valid: true } | { valid: false; message: string };

export async function isValidCNPJ(cnpj: string): Promise<CNPJValidationResult> {
  const cnpjRegex = cnpj.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (
    !z
      .string()
      .regex(/^[A-Z0-9]{12}\d{2}$/)
      .safeParse(cnpjRegex).success
  ) {
    return { valid: false, message: "O CNPJ informado não é válido." };
  }
   try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${cnpjRegex}`,
        );
        if (response.status === 404 || response.status === 400) {
          return { valid: false, message: "O CNPJ informado não foi encontrado." };
        }
        if (!response.ok) {
          return { valid: false, message: "Serviço de consulta de CNPJ indisponível no momento." };
        }
      } catch{
        return { valid: false, message: "Falha de conexão ao validar o CNPJ. Verifique sua internet." };
      }
  return { valid: true };
}
