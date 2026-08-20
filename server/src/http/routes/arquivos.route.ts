// src/http/routes/arquivos.route.ts
import { FastifyInstance } from 'fastify'
import { uploadPdfController } from '../controllers/arquivo.controller'

export async function arquivosRoute(app: FastifyInstance) {
  // Quando fizerem POST em /upload, o Fastify dispara o controller
  app.post('/upload', uploadPdfController)
}
