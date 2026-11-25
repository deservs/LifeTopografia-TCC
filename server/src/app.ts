import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { z } from 'zod'

import {
  isAdminUser,
  listAdminCompanyMembers,
  listAdminUsers,
} from './modules/admin/listUsers.js'
import { CheckPassword, DeleteAccount } from './modules/auth/deleteAccount.js'
import {
  removeCompanyMember,
  updateMemberStatus,
} from './modules/auth/manageMembers.js'
import { MemberSignUp } from './modules/auth/memberSignup.js'
import { SearchMemberData } from './modules/auth/searchMembers.js'
import { Login } from './modules/auth/userSingin.js'
import { SignUp } from './modules/auth/userSingup.js'
import { updateUserProfile } from './modules/auth/userUpdate.js'
import sendEmail from './modules/email/sendEmail.js'
import getUserFromRequest from './Shared/middleware/getUser.js'
import { UrlFileGenerator } from './Shared/storage/r2.js'
import { normalizeCnpj } from './Shared/utils/cnpj.js'
import { isValidCNPJ } from './modules/cnpj/verificarCnpj.js';

export const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Registra o CORS liberando acesso geral
app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
  },
})

app.post('/api/login', async (request, reply) => {
  try {
    const parsedBody = z
      .object({
        valor: z.string().min(1, { message: 'O valor de login não pode estar vazio.' }),
        type: z.enum(['cnpj', 'email']),
        password: z.string().min(1, { message: 'A senha não pode estar vazia.' }),
        captchaToken: z
          .string()
          .min(1, { message: 'O token do captcha não pode estar vazio.' }),
      })
      .safeParse(request.body)

    if (!parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parsedBody.error.flatten().fieldErrors,
      })
    }

    const { valor, type, password, captchaToken } = parsedBody.data
    const logar = await Login(valor, type, password, captchaToken)
    if (!logar.ok) {
      return reply.code(401).send({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: logar.message,
      })
    }

    return reply.code(200).send({
      ok: true,
      data: {
        session: logar.session,
        user: logar.user,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return reply.code(500).send({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno no servidor.',
    })
  }
})

app.post('/api/signup', async (request, reply) => {
  try {
    const parsedBody = z
      .object({
        email: z.string().email({ message: 'O email fornecido não é válido.' }),
        password: z
          .string()
          .min(8, 'A senha deve ter pelo menos 8 caracteres.')
          .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula.')
          .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula.')
          .regex(/\p{N}/u, 'A senha deve conter pelo menos um número.')
          .regex(/[^\p{L}\p{N}\s]/u, 'A senha deve conter pelo menos um símbolo.'),
        nome: z.string().min(1, { message: 'O nome não pode estar vazio.' }),
        cnpj: z.string().optional(),
        captchaToken: z
          .string()
          .min(1, { message: 'O token do captcha não pode estar vazio.' }),
      })
      .safeParse(request.body)

    if (!parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parsedBody.error.flatten().fieldErrors,
      })
    }

    const { email, password, nome, cnpj, captchaToken } = parsedBody.data
    let normalizedCnpj: string | null = null

    if (cnpj && cnpj.trim().length > 0 && cnpj !== 'null' && cnpj !== 'undefined') {
      if (!isValidCNPJ(cnpj)) {
        return reply.code(400).send({
          ok: false,
          code: 'INVALID_CNPJ',
          message: 'O CNPJ informado não é válido.',
          fieldErrors: { cnpj: ['O CNPJ informado não é válido.'] },
        })
      }
      normalizedCnpj = normalizeCnpj(cnpj)
    }

    const cadastrar = await SignUp(email, password, nome, normalizedCnpj, captchaToken)
    if (!cadastrar) {
      return reply.code(400).send({
        ok: false,
        code: 'SIGNUP_FAILED',
        message: 'Falha ao cadastrar usuário. Verifique suas credenciais.',
      })
    }

    return reply.code(200).send({
      ok: true,
      data: { message: 'Usuário cadastrado com sucesso!' },
    })
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error)
    return reply.code(500).send({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erro interno no servidor.',
    })
  }
})

app.patch(
  '/api/update-profile',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    try {
      const parsedBody = z
        .object({
          email: z
            .string()
            .email({ message: 'O email fornecido não é válido.' })
            .optional(),
          name: z
            .string()
            .min(1, { message: 'O nome não pode estar vazio.' })
            .optional(),
          avatarUrl: z
            .string()
            .refine(
              (key) => {
                const escapedUserId = request.user.id.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&',
                )
                const pattern = new RegExp(
                  `^users/${escapedUserId}/image-\\d+\\.(jpg|png|webp)$`,
                )
                return pattern.test(key)
              },
              { message: 'A chave do avatar fornecida não é válida.' },
            )
            .optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
          message: 'Pelo menos um campo deve ser fornecido.',
        })
        .safeParse(request.body)

      if (!parsedBody.success) {
        return reply.code(400).send({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos.',
          fieldErrors: parsedBody.error.flatten().fieldErrors,
        })
      }

      const updateResponse = await updateUserProfile(request.user, parsedBody.data)
      if (!updateResponse.ok) {
        return reply.code(400).send({
          ok: false,
          code: updateResponse.code ?? 'PROFILE_UPDATE_FAILED',
          message: updateResponse.message,
        })
      }

      return reply.code(200).send({
        ok: true,
        data: { message: updateResponse.message },
      })
    } catch (error) {
      request.log.error(error, 'Erro ao atualizar perfil do usuário:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.put(
  '/api/updateAvatar',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parseResult = z
      .object({
        avatarType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
          message: 'Tipo de arquivo inválido. Apenas JPEG, PNG e webp são permitidos.',
        }),
        avatarSize: z
          .number()
          .positive('O tamanho do arquivo deve ser maior que zero.')
          .max(5 * 1024 * 1024, {
            message: 'O arquivo enviado excede o tamanho máximo de 5MB.',
          }),
      })
      .safeParse(request.body)

    if (!parseResult.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      })
    }

    const userId = request.user.id
    const { avatarType, avatarSize } = parseResult.data

    try {
      const newUrl = await UrlFileGenerator(userId, avatarType, avatarSize)
      if (!newUrl.ok) {
        return reply.code(400).send({
          ok: false,
          code: 'AVATAR_URL_FAILED',
          message: newUrl.error,
        })
      }
      return reply.code(200).send({
        ok: true,
        data: {
          uploadUrl: newUrl.uploadUrl,
          key: newUrl.key,
        },
      })
    } catch (error) {
      request.log.error(error, 'Erro ao gerar URL do avatar:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro ao gerar URL do avatar',
      })
    }
  },
)

app.post(
  '/api/save-member',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parseResult = z
      .object({
        email: z.string().email({ message: 'O email fornecido não é válido.' }),
        name: z.string().min(1, { message: 'O nome não pode estar vazio.' }),
      })
      .safeParse(request.body)

    if (!parseResult.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { email, name } = parseResult.data
    const company_id = request.user.id

    try {
      const result = await MemberSignUp(email, name, company_id)
      if (!result.ok) {
        return reply.code(400).send({
          ok: false,
          code: result.code,
          message: result.message,
        })
      }

      return reply.code(200).send({
        ok: true,
        data: result.data,
      })
    } catch (error) {
      request.log.error(error, 'Erro ao cadastrar membro:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.get(
  '/api/get-members',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const userId = request.user.id
    if (!userId) {
      return reply.code(401).send({
        ok: false,
        code: 'UNAUTHENTICATED',
        message: 'Usuário não autenticado.',
      })
    }

    try {
      const members = await SearchMemberData(userId)
      if (!members.ok) {
        return reply.code(500).send({
          ok: false,
          code: members.code,
          message: members.message,
        })
      }

      return reply.code(200).send({
        ok: true,
        data: members.data,
      })
    } catch (error) {
      request.log.error(error, 'Erro ao buscar membros:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.patch(
  '/api/members/:id/status',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parsedParams = z
      .object({
        id: z.string().uuid({ message: 'ID do membro inválido.' }),
      })
      .safeParse(request.params)

    const parsedBody = z
      .object({
        status: z.enum(['ATIVO', 'AFASTADO']),
        password: z.string().min(1, { message: 'A senha é obrigatória.' }),
      })
      .safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: {
          ...(parsedParams.success ? {} : parsedParams.error.flatten().fieldErrors),
          ...(parsedBody.success ? {} : parsedBody.error.flatten().fieldErrors),
        },
      })
    }

    const userEmail = request.user.email
    if (!userEmail) {
      return reply.code(400).send({
        ok: false,
        code: 'EMAIL_NOT_FOUND',
        message: 'Email do usuário não encontrado.',
      })
    }

    try {
      const passwordStatus = await CheckPassword(userEmail, parsedBody.data.password)
      if (passwordStatus === 'invalid_password') {
        return reply.code(401).send({
          ok: false,
          code: 'INVALID_PASSWORD',
          message: 'Senha incorreta.',
        })
      }
      if (passwordStatus === 'error') {
        return reply.code(500).send({
          ok: false,
          code: 'PASSWORD_CHECK_FAILED',
          message: 'Não foi possível validar a senha atual.',
        })
      }

      const result = await updateMemberStatus(
        request.user.id,
        parsedParams.data.id,
        parsedBody.data.status,
      )

      if (!result.ok) {
        return reply.code(result.httpStatus).send({
          ok: false,
          code: result.code,
          message: result.message,
        })
      }

      return reply.code(200).send({
        ok: true,
        data: result.data,
      })
    } catch (error) {
      request.log.error(error, 'Erro ao atualizar status do membro:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.delete(
  '/api/members/:id',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parsedParams = z
      .object({
        id: z.string().uuid({ message: 'ID do membro inválido.' }),
      })
      .safeParse(request.params)

    const parsedBody = z
      .object({
        password: z.string().min(1, { message: 'A senha é obrigatória.' }),
      })
      .safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: {
          ...(parsedParams.success ? {} : parsedParams.error.flatten().fieldErrors),
          ...(parsedBody.success ? {} : parsedBody.error.flatten().fieldErrors),
        },
      })
    }

    const userEmail = request.user.email
    if (!userEmail) {
      return reply.code(400).send({
        ok: false,
        code: 'EMAIL_NOT_FOUND',
        message: 'Email do usuário não encontrado.',
      })
    }

    try {
      const passwordStatus = await CheckPassword(request.user.id, parsedBody.data.password)
      if (passwordStatus === 'invalid_password') {
        return reply.code(401).send({
          ok: false,
          code: 'INVALID_PASSWORD',
          message: 'Senha incorreta.',
        })
      }
      if (passwordStatus === 'error') {
        return reply.code(500).send({
          ok: false,
          code: 'PASSWORD_CHECK_FAILED',
          message: 'Não foi possível validar a senha atual.',
        })
      }

      const result = await removeCompanyMember(request.user.id, parsedParams.data.id)
      if (!result.ok) {
        return reply.code(result.httpStatus).send({
          ok: false,
          code: result.code,
          message: result.message,
        })
      }

      return reply.code(200).send({
        ok: true,
        data: result.data,
      })
    } catch (error) {
      request.log.error(error, 'Erro ao remover membro:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.delete(
  '/api/delete-account',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parsedBody = z
      .object({
        password: z.string().min(1, { message: 'A senha não pode estar vazia.' }),
        memberId: z
          .string()
          .min(1, { message: 'O ID do membro não pode estar vazio.' }),
      })
      .safeParse(request.body)

    if (!parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parsedBody.error.flatten().fieldErrors,
      })
    }

    if (parsedBody.data.memberId && parsedBody.data.memberId !== request.user.id) {
      return reply.code(403).send({
        ok: false,
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para excluir esta conta.',
      })
    }

    const userId = request.user.id
    const userEmail = request.user.email
    const jwt = request.headers.authorization?.split(' ')[1] || ''

    if (!userEmail) {
      return reply.code(400).send({
        ok: false,
        code: 'EMAIL_NOT_FOUND',
        message: 'Email do usuário não encontrado.',
      })
    }

    try {
      console.log('CheckPassword called with email:', userEmail, 'and password:', parsedBody.data.password); // Log the input parameters
      const passwordStatus = await CheckPassword(userId, parsedBody.data.password)
      if (passwordStatus === 'invalid_password') {
        return reply.code(401).send({
          ok: false,
          code: 'INVALID_PASSWORD',
          message: 'Senha incorreta.',
        })
      }
      if (passwordStatus === 'error') {
        return reply.code(500).send({
          ok: false,
          code: 'PASSWORD_CHECK_FAILED',
          message: 'Não foi possível validar a senha atual.',
        })
      }

      const deleteResponse = await DeleteAccount(userId, jwt)
      if (deleteResponse === 'forbidden') {
        return reply.code(403).send({
          ok: false,
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para excluir esta conta.',
        })
      }
      if (deleteResponse === 'blocked') {
        return reply.code(403).send({
          ok: false,
          code: 'BLOCKED',
          message: 'Conta bloqueada.',
        })
      }
      if (deleteResponse === 'deleted') {
        return reply.code(200).send({
          ok: true,
          data: { status: 'deleted' },
        })
      }

      request.log.error({ deleteResponse }, 'Erro interno em DeleteAccount')
      return reply.code(500).send({
        ok: false,
        code: 'DELETE_ACCOUNT_FAILED',
        message: 'Erro inesperado ao excluir a conta.',
      })
    } catch (error) {
      request.log.error(error, 'Erro ao excluir conta:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.get(
  '/api/admin/users',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    try {
      const admin = await isAdminUser(request.user.id)
      if (!admin) {
        return reply.code(403).send({
          ok: false,
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem acessar esta listagem.',
        })
      }

      const parsedQuery = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(10),
          search: z.string().trim().max(120).optional(),
          type: z.enum(['PESSOA_FISICA', 'EMPRESA']).optional(),
        })
        .safeParse(request.query)

      if (!parsedQuery.success) {
        return reply.code(400).send({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Parâmetros de consulta inválidos.',
          fieldErrors: parsedQuery.error.flatten().fieldErrors,
        })
      }

      const result = await listAdminUsers(parsedQuery.data)
      if (!result.ok) {
        return reply.code(500).send({
          ok: false,
          code: result.code,
          message: result.message,
        })
      }

      return reply.code(200).send(result)
    } catch (error) {
      request.log.error(error, 'Erro ao consultar usuários admin:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.get(
  '/api/admin/users/:companyId/members',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    try {
      const admin = await isAdminUser(request.user.id)
      if (!admin) {
        return reply.code(403).send({
          ok: false,
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem consultar membros de empresas.',
        })
      }

      const parsedParams = z
        .object({
          companyId: z.string().uuid({ message: 'ID da empresa inválido.' }),
        })
        .safeParse(request.params)

      if (!parsedParams.success) {
        return reply.code(400).send({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Parâmetro inválido.',
          fieldErrors: parsedParams.error.flatten().fieldErrors,
        })
      }

      const result = await listAdminCompanyMembers(parsedParams.data.companyId)
      if (!result.ok) {
        return reply.code(500).send({
          ok: false,
          code: result.code,
          message: result.message,
        })
      }

      return reply.code(200).send(result)
    } catch (error) {
      request.log.error(error, 'Erro ao consultar membros da empresa (admin):')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno no servidor.',
      })
    }
  },
)

app.post(
  '/api/send-email',
  { preHandler: [getUserFromRequest] },
  async (request, reply) => {
    const parsedBody = z
      .object({
        destinatario: z.string().email({ message: 'E-mail de destinatário inválido.' }),
        nome: z.string().trim().min(1, { message: 'O nome é obrigatório.' }).max(160),
      })
      .safeParse(request.body)

    if (!parsedBody.success) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        fieldErrors: parsedBody.error.flatten().fieldErrors,
      })
    }

    try {
      const { data, error } = await sendEmail(
        parsedBody.data.destinatario,
        parsedBody.data.nome,
      )
      if (error) {
        return reply.code(500).send({
          ok: false,
          code: 'EMAIL_SEND_FAILED',
          message: 'Erro ao enviar email.',
        })
      }
      return reply.code(200).send({ ok: true, data })
    } catch (error) {
      request.log.error(error, 'Erro ao enviar email:')
      return reply.code(500).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro ao enviar email.',
      })
    }
  },
)
