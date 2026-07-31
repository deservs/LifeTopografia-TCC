import { ExtrairPdf } from './extrair-pdf.service'
import { AutoCad } from './autoCad.service'
import { SendToSupabaseService } from './enviaSupabase.service'
import fs from 'fs/promises'
import path from 'path'

export class arquivoPdfService {
  constructor(
    private pdfService: ExtrairPdf,
    private autoCadService: AutoCad,
  ) {}
  async execute(fileBuffer: Buffer, fileName: string) {
    // Checa os Magic Bytes (Regra de Negócio)
    const isPDF = fileBuffer.toString('utf8', 0, 5) === '%PDF-'

    if (!isPDF) {
      // O Service lança o erro (não responde HTTP)
      throw new Error('O arquivo enviado não é um PDF válido.')
    }
    // Extrai os dados do PDF
    const dadosPdf = await this.pdfService.Extrair(fileBuffer)

    const numeros = Object.values(dadosPdf).filter((value) => typeof value === 'number') as number[]
    console.log('[arquivoPdfService] Números extraídos do PDF:', numeros)
    // Transforma os dados em estrutura do AutoCAD
    const estruturaAutoCad = await this.autoCadService.transformarEmDxf(
      numeros.map((num) => ({ x: num * 10, y: num * 10 })),
    ) // Exemplo de pontos

    // Salva o arquivo DXF no disco do servidor para visualização posterior
    const filePath = path.join(__dirname, '../routes/desenho.dxf')
    await fs.writeFile(filePath, estruturaAutoCad)

    return { message: 'DXF gerado com sucesso', dxf: estruturaAutoCad.toString('utf-8') }
  }
}
