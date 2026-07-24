import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { usersRoutes } from './http/routes/users.routes'
import { getTabelaRoute } from './http/routes/get-tabela'
import { uploadRoute } from './http/routes/upload'
// Outros imports e plugins do Zod/Swagger...

// Registra o suporte a upload de arquivos
export const app = fastify()

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

// Registrando o grupo de rotas de usuários
app.register(usersRoutes)

app.register(getTabelaRoute)

app.register(uploadRoute)
