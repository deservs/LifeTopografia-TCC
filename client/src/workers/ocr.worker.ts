import { PaddleOCR } from '@paddleocr/paddleocr-js';

// Variável global do Worker para guardar a instância da IA na memória RAM (Singleton)
let ocrEngineInstance: PaddleOCR | null = null;

// Função auxiliar para carregar o modelo ONNX apenas UMA VEZ (Lazy Warm-up)
async function getOcrEngine(): Promise<PaddleOCR> {
  if (!ocrEngineInstance) {
    console.log("[Worker] Inicializando modelos ONNX/PaddleOCR via WebAssembly...");
    
    ocrEngineInstance = await PaddleOCR.create({
      lang: 'pt',

      // Aponta para os artefatos estáticos compilados para WebAssembly
      detPath: '/models/ocr/det.onnx',
      recPath: '/models/ocr/rec.onnx',
      dicPath: '/models/ocr/latin_dict.txt',

      wasmPath: '/wasm/'
    });
    
    console.log("[Worker] Motor de IA pronto para inferência!");
  }
  return ocrEngineInstance;
}

// 2. Escuta de mensagens vindo da Main Thread (React)
self.onmessage = async (event: MessageEvent<{ type: string; image: ImageData }>) => {
  const { type, image } = event.data;

  if (type === 'PROCESS_IMAGE') {
    try {
      // Garante que o motor de IA está carregado na memória RAM do Worker
      const engine = await getOcrEngine();

      console.log("[Worker] Processando imagem de", image.width, "x", image.height, "px...");

      // TODO: Passaremos os pixels (image) para a inferência da IA
      const result = await engine.detect(image);
      const textExtraido = result.map((item:{text:string}) => item.text).join('\n');

      // Devolve a resposta para a Main Thread (React)
      self.postMessage({
        success: true,
        text: textExtraido
      });

    } catch (error) {
      // Resposta defensiva em caso de falha no pipeline
      self.postMessage({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no OCR"
      });
    }
  }
};