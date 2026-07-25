// src/http/service/upload.service.ts
import { extrairPdfRoute } from '../routes/extrair-pdf.route'
import { ExtrairPdf } from './extrair-pdf.service'
import { AutoCad } from './autoCad.service'

export class arquivoPdfService {
  /*   constructor(
    private pdfService: ExtrairPdf,
    private autoCadService: AutoCad
  ){} */
  async execute(fileBuffer: Buffer) {
    // 1. Checa os Magic Bytes (Regra de Negócio)
    const isPDF = fileBuffer.toString('utf8', 0, 5) === '%PDF-'

    if (!isPDF) {
      // O Service lança o erro (não responde HTTP)
      throw new Error('O arquivo enviado não é um PDF válido.')
    }

    /*     // 2. Extrai os dados do PDF
    const dadosPdf = await this.pdfService.desmantelar(fileBuffer)

    // 3. Transforma os dados em estrutura do AutoCAD
    const estruturaAutoCad = await this.autoCadService.transformarEmAutoCad(dadosPdf) */
  }
}
