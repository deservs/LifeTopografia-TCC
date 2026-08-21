// src/http/service/pdf.service.ts
import { DadosDesmanteladosPDF } from '../../@types/pdf.type'

export class ExtrairPdf {
  async Extrair(fileBuffer: Buffer): Promise<DadosDesmanteladosPDF> {
    // Aqui vai a sua biblioteca que lê o PDF (ex: pdf-parse, pdfjs, etc.)
    console.log('📄 [PdfService] Extraindo dados do arquivo PDF')

    // Exemplo do resultado extraído
    return {
      textoBruto: 'Planta baixa - Sala de Estar 5x4m',
      coordenadas: [
        { x: 0, y: 0 },
        { x: 500, y: 400 },
      ],
      paginas: 1,
    }
  }
}
