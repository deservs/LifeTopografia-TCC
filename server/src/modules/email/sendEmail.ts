import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function sendEmail(destinatario: string, nome: string) {
  const { data, error } = await resend.emails.send({
    from: 'LifeTopografia <contato@lifetopografia.app>',
    to: [destinatario],
    subject: 'Notificação de Atendimento - LifeTopografia',
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificação de Atendimento</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Container Principal -->
                <table role="presentation" width="400" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 3px solid #222222; text-align: left; margin: auto;">
                    <tr>
                        <td style="padding: 30px;">
                            
                            <!-- Logo -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background-color: #1a56b8; padding: 14px 24px; border-radius: 6px;">
                                        <img src="https://xlbktxwmvlmgjajyrjgi.supabase.co/storage/v1/object/public/logo/logo-front.png" alt="Life Topografia" style="max-width: 160px; height: auto; display: block;">
                                    </td>
                                </tr>
                            </table>

                            <!-- Texto Principal -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="font-size: 14px; color: #1a1a1a; line-height: 1.5;">
                                        <p style="margin-top: 0; margin-bottom: 15px;">Olá, ${nome}</p>
                                        <p style="margin-top: 0; margin-bottom: 15px;">Temos novidades sobre o seu atendimento! A equipe da LifeTopografia acabou de responder à sua mensagem no nosso chat.</p>
                                        <p style="margin-top: 0; margin-bottom: 25px;">Para visualizar a conversa completa e continuar conversando conosco, clique no botão abaixo:</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Botão -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 30px;">
                                        <a href="https://lifetopografia.vercel.app/chat" style="display: inline-block; background-color: #1a56b8; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 12px 30px; border-radius: 4px;">VISUALIZAR</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Link Alternativo -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="font-size: 13px; color: #1a1a1a; line-height: 1.5; padding-bottom: 25px;">
                                        <p style="margin-top: 0; margin-bottom: 5px;">Se o botão acima não funcionar, copie e cole este link no seu navegador:</p>
                                        <a href="https://lifetopografia.vercel.app/chat" style="color: #007bff; text-decoration: none; word-break: break-all;">https://lifetopografia.vercel.app/chat</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Assinatura -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="font-size: 14px; color: #1a1a1a; line-height: 1.4;">
                                        <p style="margin-top: 0; margin-bottom: 0;">Atenciosamente,</p>
                                        <p style="margin-top: 0; margin-bottom: 0;">Equipe LifeTopografia</p>
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
</html>
`,
  })
  console.log('Resposta do envio de email:', { data, error })
  return { data, error }
}
