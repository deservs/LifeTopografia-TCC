function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function gerarHtmlEmail2FA(nomeOuRazao: string, codigo6Digitos: string): string {
  const nomeSeguro = escaparHtml(nomeOuRazao || "Usuário");
  const digitos = codigo6Digitos.slice(0, 6).split("");

  const celulasCodigo = digitos
    .map(
      (digito, index) => `
      <td align="center" width="38" height="44" style="border: 2px solid #222222; border-radius: 4px; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; color: #1a1a1a;">
        ${digito}
      </td>
      ${index < digitos.length - 1 ? '<td width="8"></td>' : ""}
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de verificação — LifeTopografia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="420" cellspacing="0" cellpadding="0" border="0" style="max-width: 100%; background-color: #ffffff; border: 3px solid #222222; text-align: left; margin: auto;">
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="background-color: #1a56b8; padding: 14px 24px; border-radius: 6px;">
                    <img src="https://xlbktxwmvlmgjajyrjgi.supabase.co/storage/v1/object/public/logo/logo-front.png" alt="LifeTopografia" style="max-width: 160px; height: auto; display: block;">
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-top: 25px; font-size: 14px; color: #1a1a1a; line-height: 1.5;">
                    <p style="margin-top: 0; margin-bottom: 15px;">Olá, <strong>${nomeSeguro}</strong></p>
                    <p style="margin-top: 0; margin-bottom: 15px;">Recebemos uma solicitação para confirmar sua identidade ou alterar dados sensíveis da sua conta na LifeTopografia.</p>
                    <p style="margin-top: 0; margin-bottom: 25px;">Seu código de verificação é:</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${celulasCodigo}
                      </tr>
                    </table>
                    <p style="margin-top: 12px; margin-bottom: 0; font-size: 13px; color: #555555;">O código expirará em 5 minutos.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 13px; color: #1a1a1a; line-height: 1.5; padding-bottom: 25px;">
                    <p style="margin-top: 0; margin-bottom: 0;">Se você não fez essa solicitação, desconsidere este e-mail. Recomenda-se acessar o sistema e verificar se suas credenciais estão seguras.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 14px; color: #1a1a1a; line-height: 1.4;">
                    <p style="margin-top: 0; margin-bottom: 0;">Atenciosamente,</p>
                    <p style="margin-top: 0; margin-bottom: 0;"><strong>Equipe LifeTopografia</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}