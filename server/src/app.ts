import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { arquivosRoute } from './http/routes/arquivos.route'
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'

// Registra o suporte a upload de arquivos
export const app = fastify().withTypeProvider<ZodTypeProvider>()

// Configura o compilador de validação e serialização do Zod
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Registra o CORS liberando acesso geral
app.register(fastifyCors, {
  origin: true, // Permite qualquer origem (localhost:5173, localhost:3000, etc.)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

app.register(fastifyMultipart, {
  limits: {
    fileSize: 8 * 1024 * 1024, // Limite de 8MB por arquivo
  },
})

// Registrando o grupo de rotas
app.register(arquivosRoute)
