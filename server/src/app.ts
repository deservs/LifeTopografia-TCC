import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { arquivosRoute } from './modules/AutoCad/arquivos.route'

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

// Registrando o grupo de rotas
app.register(arquivosRoute)
