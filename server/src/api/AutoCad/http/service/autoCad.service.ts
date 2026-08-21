// src/http/service/autoCad.service.ts
import Drawing from 'dxf-writer'
import Fastify from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { DadosDesmanteladosPDF } from '../../@types/pdf.type'

const FILE_PATH = './dados.json';

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
    drawing.drawLine(0, 0, 10, 0) // Lado 1 (Subindo pra direita)
    drawing.drawLine(10, 0, 10, 22.19) // Lado 2 (Descendo pra direita)
    drawing.drawLine(10, 22.19, -10, 22.19) // Lado 3 (Descendo pra esquerda)
    drawing.drawLine(-10, 22.19, 0, 0) // Lado 4 (Subindo pra esquerda)

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
