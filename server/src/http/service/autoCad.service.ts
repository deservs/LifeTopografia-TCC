// src/http/service/autoCad.service.ts
import { ExtrairPdf } from './extrair-pdf.service'
import { DadosDesmanteladosPDF } from '../../@types/pdf.type'

export interface EstruturaAutoCad {
  layers: string[]
  elementosGeo: Array<{ tipo: string; pontos: string }>
  convertidoEm: string
}

export class AutoCad {
  async transformarEmAutoCad(
    dadosPdf: DadosDesmanteladosPDF,
  ): Promise<EstruturaAutoCad> {
    console.log(
      '📐 [AutoCadService] Transformando dados do PDF para estrutura do AutoCAD...',
    )

    // Lógica para converter o texto/coordenadas em elementos do AutoCAD
    const elementosGeo = dadosPdf.coordenadas.map((ponto) => ({
      tipo: 'LINHA',
      pontos: `X:${ponto.x} Y:${ponto.y}`,
    }))

    return {
      layers: ['0', 'PAREDES', 'TEXTO_DESCRITIVO'],
      elementosGeo,
      convertidoEm: new Date().toISOString(),
    }
  }
}
