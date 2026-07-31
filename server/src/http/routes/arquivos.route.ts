// src/http/routes/arquivos.route.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { uploadPdfController } from '../controllers/arquivo.controller'
import fs from 'fs/promises'
import path from 'path'

export async function arquivosRoute(app: FastifyInstance) {
  // Quando fizerem POST em /upload, o Fastify dispara o controller
  app.post('/upload', uploadPdfController)
  app.withTypeProvider<ZodTypeProvider>().get('/ver', {
    schema: {
      summary: 'Retorna o conteúdo do arquivo DXF gerado',
      response: {
        200: z.string(),
        404: z.object({ error: z.string() }),
        500: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    try {
      const filePath = path.join(__dirname, 'desenho.dxf')
      try {
        await fs.access(filePath)
      } catch {
        return reply.status(404).send({ error: 'Arquivo DXF ainda não foi gerado no servidor. Envie um PDF primeiro.' })
      }
      const data = await fs.readFile(filePath, 'utf-8')
      return reply.type('text/plain').send(data)
    } catch (error) {
      console.error('Erro ao ler o arquivo DXF:', error)
      return reply.status(500).send({ error: 'Erro ao ler o arquivo DXF' })
    }
  })

}
