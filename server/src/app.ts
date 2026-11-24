import { fastify } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { z } from "zod";

import { Login } from "./modules/auth/userSingin.js";
import { SignUp } from "./modules/auth/userSingup.js";
import { updateUserProfile } from "./modules/auth/userUpdate.js";
import getUserFromRequest from "./Shared/middleware/getUser.js";
import { MemberSignUp } from "./modules/auth/memberSignup.js";
import { SearchMemberData } from "./modules/auth/searchMembers.js";
import { DeleteAccount, CheckPassword } from "./modules/auth/deleteAccount.js";

import { UrlFileGenerator } from "./Shared/storage/r2.js";

import sendEmail from "./modules/email/sendEmail.js";

export const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Registra o CORS liberando acesso geral
app.register(fastifyCors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
  },
});

app.post("/api/login", async (request, reply) => {
  try {
    const parsedBody = z
      .object({
        valor: z
          .string()
          .min(1, { message: "O valor de login não pode estar vazio." }),
        type: z.enum(["cnpj", "email"]),
        password: z
          .string()
          .min(1, { message: "A senha não pode estar vazio." }),
        captchaToken: z
          .string()
          .min(1, { message: "O token do captcha não pode estar vazio." }),
      })
      .safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        message: "Dados inválidos.",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }
    const { valor, type, password, captchaToken } = parsedBody.data;
    const logar = await Login(valor, type, password, captchaToken);
    if (!logar.ok) {
      return reply.code(401).send({ message: logar.message });
    } else {
      return reply.code(200).send({ data: logar.session, user: logar.user });
    }
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return reply.code(500).send({ message: "Erro interno no servidor." });
  }
});

app.post("/api/signup", async (request, reply) => {
  try {
    const parsedBody = z
      .object({
        email: z.string().email({ message: "O email fornecido não é válido." }),
        password: z
          .string()
          .min(8, { message: "A senha deve ter pelo menos 8 caracteres." }),
        nome: z.string().min(1, { message: "O nome não pode estar vazio." }),
        cnpj: z.string().optional(),
        captchaToken: z
          .string()
          .min(1, { message: "O token do captcha não pode estar vazio." }),
      })
      .safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        message: "Dados inválidos.",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }
    const { email, password, nome, cnpj, captchaToken } = parsedBody.data;
    const cadastrar = await SignUp(email, password, nome, cnpj, captchaToken);
    if (!cadastrar) {
      return reply.code(400).send({
        message: "Falha ao cadastrar usuário. Verifique suas credenciais.",
      });
    }
    return reply.code(200).send({ message: "Usuario cadastrado com sucesso!" });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return reply.code(500).send({ message: "Erro interno no servidor." });
  }
});

app.patch(
  "/api/update-profile",
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    try {
      const parsedBody = z
        .object({
          email: z
            .string()
            .email({ message: "O email fornecido não é válido." })
            .optional(),
          name: z
            .string()
            .min(1, { message: "O nome não pode estar vazio." })
            .optional(),
          avatarUrl: z
            .string()
            .refine(
              (key) => {
                const escapedUserId = request.user.id.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&",
                );
                const pattern = new RegExp(
                  `^users/${escapedUserId}/image-\\d+\\.(jpg|png|webp)$`,
                );
                return pattern.test(key);
              },
              { message: "A chave do avatar fornecida não é válida." },
            )
            .optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
          message: "Pelo menos um campo deve ser fornecido.",
        })
        .safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          message: "Dados inválidos.",
          errors: parsedBody.error.flatten().fieldErrors,
        });
      }
      const updateResponse = await updateUserProfile(
        request.user,
        parsedBody.data,
      );
      if (!updateResponse.ok) {
        return reply.code(400).send({ message: updateResponse.message });
      }
      return reply.code(200).send({ message: updateResponse.message });
    } catch (error) {
      request.log.error(error, "Erro ao atualizar perfil do usuário:");
      return reply.code(500).send({ message: "Erro interno no servidor." });
    }
  },
);

app.put(
  "/api/updateAvatar",
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parseResult = z
      .object({
        avatarType: z.enum(["image/jpeg", "image/png", "image/webp"], {
          message:
            "Tipo de arquivo inválido. Apenas JPEG, PNG e webp são permitidos.",
        }),
        avatarSize: z
          .number()
          .positive("O tamanho do arquivo deve ser maior que zero.")
          .max(5 * 1024 * 1024, {
            message: "O arquivo enviado excede o tamanho máximo de 5MB.",
          }),
      })
      .safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        message: "Dados inválidos.",
        errors: parseResult.error.flatten().fieldErrors,
      });
    }
    const userId = request.user.id;

    const { avatarType, avatarSize } = parseResult.data;
    try {
      const newUrl = await UrlFileGenerator(userId, avatarType, avatarSize);
      if (!newUrl.ok) {
        return reply.code(400).send({ message: newUrl.error });
      }
      return reply.code(200).send({ data: newUrl });
    } catch (error) {
      request.log.error(error, "Erro ao gerar URL do avatar:");
      return reply.code(500).send({ message: "Erro ao gerar URL do avatar" });
    }
  },
);

app.post(
  "/api/save-member",
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parseResult = z
      .object({
        email: z.string().email({ message: "O email fornecido não é válido." }),
        name: z.string().min(1, { message: "O nome não pode estar vazio." }),
      })
      .safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        message: "Dados inválidos.",
        errors: parseResult.error.flatten().fieldErrors,
      });
    }
    const { email, name } = parseResult.data;
    const company_id = request.user.id; 
    try {
      const sendResetResponse = await MemberSignUp(email, name, company_id);
      if (!sendResetResponse.ok) {
        return reply.code(400).send({ message: sendResetResponse.message });
      }
      return reply.code(200).send({ data: sendResetResponse });
    } catch (error) {
      request.log.error(error, "Erro ao cadastrar membro:");
      return reply.code(500).send({ message: "Erro interno no servidor." });
    }
  },
);

app.get(
  "/api/get-members",
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.code(401).send({ message: "Usuário não autenticado." });
    }
    try {
      const members = await SearchMemberData(userId);
      if (!members) {
        return reply.code(404).send({ message: "Nenhum membro encontrado." });
      }
      return reply.code(200).send({ members });
    } catch (error) {
      request.log.error(error, "Erro ao buscar membros:");
      return reply.code(500).send({ message: "Erro interno no servidor." });
    }
  },
);

app.delete(
  "/api/delete-account",
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parsedBody = z
      .object({
        password: z
          .string()
          .min(1, { message: "A senha não pode estar vazia." }),
        memberId: z
          .string()
          .min(1, { message: "O ID do membro não pode estar vazio." }),
      })
      .safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        message: "Dados inválidos.",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }
    if (
      parsedBody.data.memberId &&
      parsedBody.data.memberId !== request.user.id
    ) {
      return reply.code(403).send({
        status: "forbidden",
        message: "Você não tem permissão para excluir esta conta.",
      });
    }

    const userId = request.user.id;
    const userEmail = request.user.email;

    if (!userEmail) {
      return reply
        .code(400)
        .send({ message: "Email do usuário não encontrado." });
    }
    try {

    const passwordStatus = await CheckPassword(
      userEmail,
      parsedBody.data.password,
    );
    if (passwordStatus === "invalid_password") {
      return reply.code(401).send({
        status: "invalid_password",
        message: "Senha incorreta.",
      });
    }

      const deleteResponse = await DeleteAccount(userId);
      if (deleteResponse === "forbidden") {
        return reply.code(403).send({
          status: "forbidden",
          message: "Você não tem permissão para excluir esta conta.",
        });
      }
      if (deleteResponse === "blocked") {
        return reply.code(403).send({
          status: "blocked",
          message: "Conta bloqueada.",
        });
      }
      if (deleteResponse === "deleted") {
        return reply.code(200).send({
          status: "deleted",
          message: "Conta excluída com sucesso.",
        });
      }
      request.log.error(
        { deleteResponse },
        "Retorno inesperado em DeleteAccount",
      );
      return reply.code(500).send({
        status: "error",
        message: "Erro inesperado ao excluir a conta.",
      });
    } catch (error) {
      request.log.error(error, "Erro ao excluir membro:");
      return reply.code(500).send({
        status: "error",
        message: "Erro interno no servidor.",
      });
    }
  },
);

app.post("/api/send-email", async (request, reply) => {
  const { destinatario, nome } = request.body as {
    destinatario: string;
    nome: string;
  };
  try {
    const { data, error } = await sendEmail(destinatario, nome);
    if (error) {
      return reply
        .code(500)
        .send({ message: "Erro ao enviar email", error: error });
    } else {
      return reply.code(200).send({ data: data });
    }
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return reply
      .code(500)
      .send({ message: "Erro ao enviar email", error: error });
  }
});
