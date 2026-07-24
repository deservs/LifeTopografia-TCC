import type { FastifyInstance } from 'fastify'
import { createUserController } from '../controllers/create-user.controller'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/users', createUserController)
  // app.get('/users', getUsersController)
  // app.get('/users/:id', getUserByIdController)
}
