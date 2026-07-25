// src/http/controllers/arquivo.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { arquivoPdfService } from '../service/arquivo.service'
import { ExtrairPdf } from '../service/extrair-pdf.service'
import { AutoCad } from '../service/autoCad.service'

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
    // Converte o stream do arquivo recebido para um Buffer do Node.js
    const fileBuffer = await data.toBuffer()
    const fileName = data.filename

    // Chama o Service enviando o Buffer (A lógica do %PDF- é idêntica!)
    const pdfService = new ExtrairPdf()
    const autoCadService = new AutoCad()
    const uploadPdfService = new arquivoPdfService(pdfService, autoCadService)
    const file = await uploadPdfService.execute(fileBuffer, fileName)

    //  em caso de sucesso, retorna uma resposta HTTP 201 (Created)
    return reply.status(201).send({ message: 'PDF enviado com sucesso!', file: file } )
  } catch (error: any) {
    // O Controller captura o erro lançado pelo Service e devolve pro cliente
    return reply.status(400).send({ error: error.message })
  }
}
