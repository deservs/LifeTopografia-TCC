import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { z } from "zod";

import { Login } from './modules/auth/userSingin.js'
import { SignUp } from './modules/auth/userSingup.js'

import sendEmail from './modules/email/sendEmail.js'

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
    const parsedBody = z.object({
      valor: z.string().min(1, { message: "O valor de login não pode estar vazio." }),
      type: z.enum(['cnpj', 'email']),
      password: z.string().min(1, { message: "A senha não pode estar vazio." }),
      captchaToken: z.string().min(1, { message: "O token do captcha não pode estar vazio." }),
    }).safeParse(request.body);
    if (!parsedBody.success) {
      return reply
        .code(400)
        .send({ message: 'Dados inválidos.', errors: parsedBody.error.flatten().fieldErrors });
    }
    const { valor, type, password, captchaToken } = parsedBody.data;
    const logar = await Login(valor, type, password, captchaToken)
    if (!logar.ok) {
      return reply
        .code(401)
        .send({ message:logar.message })
    } else {
      return reply.code(200).send({ data: logar.session, user: logar.user })
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return reply.code(500).send({ message: 'Erro interno no servidor.', error: error })
  }
})

app.post('/api/signup', async (request, reply) => {
  try {
    const parsedBody = z.object({
      email: z.string().email({ message: "O email fornecido não é válido." }),
      password: z.string().min(8, { message: "A senha deve ter pelo menos 8 caracteres." }),
      nome: z.string().min(1, { message: "O nome não pode estar vazio." }),
      cnpj: z.string().optional(),
      captchaToken: z.string().min(1, { message: "O token do captcha não pode estar vazio." }),
    }).safeParse(request.body);
    if (!parsedBody.success) {
      return reply
        .code(400)
        .send({ message: 'Dados inválidos.', errors: parsedBody.error.flatten().fieldErrors });
    }
    const { email, password, nome, cnpj, captchaToken } = parsedBody.data;
    const cadastrar = await SignUp(email, password, nome, cnpj, captchaToken)
    if (!cadastrar) {
      return reply
        .code(400)
        .send({ message: 'Falha ao cadastrar usuário. Verifique suas credenciais.' })
    } else {
      return reply.code(200).send("Usuario cadastrado com sucesso!")
    }
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error)
    return reply.code(500).send({ message: 'Erro interno no servidor.', error: error })
  }
})

app.post('/api/send-email', async (request, reply) => {
  const { destinatario, nome } = request.body as { destinatario: string; nome: string }
  try {
    const { data, error } = await sendEmail(destinatario, nome)
    if (error) {
      return reply.code(500).send({ message: 'Erro ao enviar email', error: error })
    } else {
      return reply.code(200).send({ data: data })
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return reply.code(500).send({ message: 'Erro ao enviar email', error: error })
  }
})
