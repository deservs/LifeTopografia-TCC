import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export async function createUserController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Schema do Zod
  const createUserBodySchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
  })

  // Validação
  const { name, email } = createUserBodySchema.parse(request.body)

  // Aqui você chamaria o seu Use Case / Service
  // await createUserUseCase({ name, email })

  return reply.status(201).send({ message: 'Usuário criado com sucesso!' })
}
