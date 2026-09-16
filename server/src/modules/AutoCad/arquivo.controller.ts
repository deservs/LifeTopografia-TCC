// src/http/controllers/arquivo.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { PDFDocument } from 'pdf-lib'

import { ConvertToPdfService } from './services/convert-to-pdf.service'

export const arquivoSchema = z.object({
  filename: z.string().min(1, 'nome do arquivo é obrigatório'),
  mimetype: z.enum(['application/pdf'], { message: 'O arquivo deve ser um PDF' }),
})

export async function uploadPdfController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Fastify pega o arquivo enviado no Multipart de forma assíncrona
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo foi enviado.' })
    }

    const validation = arquivoSchema.safeParse({
      filename: data.filename,
      mimetype: data.mimetype,
    })

    if (!validation.success) {
      const primeiroErro = validation.error.issues[0].message
      return reply.status(400).send({ error: primeiroErro })
    }

    const fileBuffer = await data.toBuffer()

    const documentoPdf = await PDFDocument.load(fileBuffer)
    if (documentoPdf.getPageCount() > 10) {
      return reply.status(400).send({ error: 'O arquivo PDF possui mais de 10 páginas. Por favor, envie um arquivo com no máximo 10 páginas.' })
    }

    const resultado = await ConvertToPdfService(fileBuffer)

    return reply.status(200).send({
      message: 'PDF enviado e processado com sucesso!',
      resultado,
    })
  } catch (error: any) {
    // O Controller captura o erro lançado pelo Service e devolve pro cliente
    return reply.status(400).send({ error: error.message })
  }
}
