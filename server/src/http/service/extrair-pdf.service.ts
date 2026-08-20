// src/http/service/pdf.service.ts
import { SegmentoTopografico } from '../../@types/pdf.type'
import { recognize, createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'

export class ExtrairPdf {
  async Extrair(fileBuffer: Buffer): Promise<SegmentoTopografico> {
    let pdfExtraido = ''
    if (!fileBuffer) {
      return identificarEProcessarSegmento(pdfExtraido)
    }
    const data = new Uint8Array(fileBuffer)
    const pdfDocument = await pdfjsLib.getDocument({ data }).promise
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      // 2. Pega a página atual
      const page = await pdfDocument.getPage(i)

      // 3. Define a escala/zoom (2.0 a 3.0 para aumentar a nitidez para o OCR)
      const viewport = page.getViewport({ scale: 2.5 })

      // 4. Renderiza o conteúdo da página para texto/dados
      const textContent = await page.getTextContent()

      // Se o PDF já contiver texto digitado (não for uma foto/escaneado), extrai direto:
      const textoDireto = textContent.items.map((item: any) => item.str).join(' ')

      if (textoDireto.trim().length > 20) {
        console.log(`\n--- 📜 TEXTO EXTRAÍDO DA PÁGINA ${i} (PDF Digital) ---`)
        console.log(textoDireto)
        pdfExtraido += textoDireto + '\n';
      } else {
        // Se for uma imagem/escaneado, rodamos o Tesseract
        console.log(
          `🔍 Página ${i} é uma foto/imagem escaneada. Rodando Tesseract OCR...`,
        )

        // Converte a página em imagem no formato necessário
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')

        // Renderiza a página do PDF dentro do Canvas
        await page.render({
         canvasContext: context as any,
         viewport: viewport,
         }).promise

         // Converte a página renderizada para Buffer de Imagem PNG
        const imageBuffer = canvas.toBuffer('image/png')

        // Passa os dados da imagem para o Tesseract
        const { data } = await recognize(imageBuffer, 'por')
        console.log(`Confiança/Legibilidade: ${Math.round(data.confidence)}%`)
        console.log(data.text)
        
        pdfExtraido += data.text + '\n';
      }
    }
    return identificarEProcessarSegmento(pdfExtraido)
  }
}
function identificarEProcessarSegmento(textoTrecho: string): SegmentoTopografico {
  const texto = textoTrecho.toUpperCase()

  // Regra 1: Verifica presença de coordenadas UTM (Contém N e E com valores numéricos altos)
  const temCoordenadas = /(E\s*=\s*\d+|N\s*=\s*\d+|X\s*=\s*\d+|Y\s*=\s*\d+)/i.test(
    texto,
  )
  console.log(temCoordenadas)
  // Regra 2: Verifica presença de Rumo ou Azimute (Contém °, ' e ", ou direções NE, SE, NW, SW)
  const temRumoOuAzimute = /RUMO|AZIMUTE|\d+°|\d+º|\b(NE|SE|SW|NW|SO|NO)\b/i.test(texto)
  console.log(temRumoOuAzimute)

  if (temCoordenadas) {
    return {
      tipo: 'COORDENADAS_E_MEDIDAS',
      verticeOrigem: 'V-01',
      verticeDestino: 'V-02',
      coordenadaOrigem: { vertice: 'V-01', esteX: 212345.67, norteY: 7456789.01 },
      coordenadaDestino: { vertice: 'V-02', esteX: 212395.67, norteY: 7456839.01 },
      distanciaMetros: 70.71,
    }
  }

  if (temRumoOuAzimute) {
    return {
      tipo: 'RUMO_E_DISTANCIA',
      verticeOrigem: 'P-01',
      verticeDestino: 'P-02',
      rumo: { graus: 45, minutos: 30, segundos: 12, quadrante: 'NE' },
      distanciaMetros: 50.0,
    }
  }

  // Se não tem coordenadas nem rumo, mas tem uma medida em metros
  return {
    tipo: 'APENAS_DISTANCIA',
    distanciaMetros: 15.0,
    confrontante: 'Rua das Flores',
  }
}
