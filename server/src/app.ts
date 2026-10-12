import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { Login } from './modules/login/userSingin.js'

export const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Registra o CORS liberando acesso geral
app.register(fastifyCors, {
  origin: true, // Permite qualquer origem (localhost:5173, localhost:3000, etc.)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
  },
})

app.post('/api/login', async (request, reply) => {
  const { valor, type, password, captchaToken } = request.body as {
    valor: string
    type: 'cnpj' | 'email'
    password: string
    captchaToken: string
  }
  try {
    const logar = await Login(valor, type, password, captchaToken)
    if (!logar) {
      return reply
        .code(401)
        .send({ message: 'Falha no login. Verifique suas credenciais.' })
    } else {
      return reply.code(200).send({ data: logar })
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return reply.code(500).send({ message: 'Erro ao buscar usuário', error: error })
  }
})
