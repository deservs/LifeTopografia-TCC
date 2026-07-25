// src/http/service/upload.service.ts
import { ExtrairPdf } from './extrair-pdf.service'
import { AutoCad } from './autoCad.service'
import { SendToSupabaseService } from './enviaSupabase.service'

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

    // Envia o PDF para o Supabase (ou outro serviço de armazenamento)
    await SendToSupabaseService(fileBuffer, fileName, 'pdf', 'token-de-autenticacao')

    // Extrai os dados do PDF
    const dadosPdf = await this.pdfService.Extrair(fileBuffer)

    const numeros = [0, 0, 1, 0, 1, 2.219, 2, 2.219, 1, 3.064]
    // Transforma os dados em estrutura do AutoCAD
    const estruturaAutoCad = await this.autoCadService.transformarEmDxf(
      numeros.map((num) => ({ x: num * 10, y: num * 10 })),
    ) // Exemplo de pontos

    // Envia o arquivo do AutoCAD para o Supabase (ou outro serviço de armazenamento)
    const caminhoAutoCad = await SendToSupabaseService(
      estruturaAutoCad,
      fileName + '.dxf',
      'cad',
      'token-de-autenticacao',
    )
    return caminhoAutoCad // Retorna o caminho do arquivo no Supabase;
  }
}
