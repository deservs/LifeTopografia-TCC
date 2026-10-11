import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { searchUser } from './modules/login/userSearch.js'

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

app.get('/api/login', async (request, reply) => {
  const { valor, type } = request.query as { valor: string; type: 'cnpj' | 'nome' }
  try {
    const email = await searchUser(valor, type)
    console.log('Email encontrado:', email)
    return reply
      .code(200)
      .send({ message: 'Servidor rodando com sucesso!', reply: email })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return reply.code(500).send({ message: 'Erro ao buscar usuário', error: error })
  }
})
