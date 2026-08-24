import { PaddleOCR } from '@paddleocr/paddleocr-js'


const iniciarOcr = async () => {
  const ocr = await PaddleOCR.create({
    lang: 'pt',
    ocr_version: 'PP-OCRv5',
    ortOptions: {
      backend: 'wasm',
      wasmPaths: '/wasm/',
      numThreads: 2,
      simd: true
    }
  })

  return ocr;
}