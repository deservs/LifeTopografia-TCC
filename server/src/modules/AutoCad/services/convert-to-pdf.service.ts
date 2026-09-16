import { JSONObject } from '@fastify/swagger';
import { pdf } from 'pdf-to-img'

export async function ConvertToPdfService(
  fileBuffer: Buffer,
): Promise<JSONObject[]> {
  try {
    const documento = await pdf(fileBuffer, {scale: 2.0})
    const resultPerPage: JSONObject[] = []

    let numeroPagina = 1;


    console.log({
      message:'Extração de texto concluída com sucesso.',
      infos:resultPerPage})
    return resultPerPage
  } catch (error: any) {
    console.error('Erro ao extrair PDF via Google Cloud Vision:', error)
    throw new Error(`Falha ao extrair PDF: ${error.message || 'Verifique as credenciais do Google Cloud'}`)
  }
}