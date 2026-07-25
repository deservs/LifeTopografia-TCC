// src/http/service/autoCad.service.ts
import Drawing from 'dxf-writer'
import { DadosDesmanteladosPDF } from '../../@types/pdf.type'

export interface EstruturaAutoCad {
  layers: string[]
  elementosGeo: Array<{ tipo: string; pontos: string }>
  convertidoEm: string
}

export interface Ponto {
  x: number
  y: number
}

export class AutoCad {
  async transformarEmDxf(pontos: Ponto[]): Promise<Buffer> {
    console.log('[AutoCadService] Transformando dados do PDF para estrutura do AutoCAD')

    // A classe Drawing possui tipagem completa no TypeScript
    const drawing = new Drawing()

    // O TS sabe que o primeiro parâmetro é string e o segundo é um código ACI (número)
    drawing.addLayer('PAREDES', Drawing.ACI.RED, 'CONTINUOUS')
    drawing.setActiveLayer('PAREDES')

    // 1. O Losango (4 Linhas)
    drawing.drawLine(50, 50, 100, 100) // Lado 1 (Subindo pra direita)
    drawing.drawLine(100, 100, 150, 50) // Lado 2 (Descendo pra direita)
    drawing.drawLine(150, 50, 100, 0) // Lado 3 (Descendo pra esquerda)
    drawing.drawLine(100, 0, 50, 50) // Lado 4 (Subindo pra esquerda)

    // 2. O Semi-círculo no centro do losango (X=100, Y=50)
    drawing.drawArc(
      100, // X do Centro
      50, // Y do Centro
      50, // Raio (tamanho do arco)
      0, // Ângulo inicial (0 graus)
      180, // Ângulo final (180 graus = Metade de um círculo)
    )

    // Exporta como String e converte para Buffer
    const dxfContent = drawing.toDxfString()
    return Buffer.from(dxfContent, 'utf-8')
  }
}
