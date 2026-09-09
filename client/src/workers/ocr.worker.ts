import { useState, useEffect, useCallback } from 'react';
import { PaddleOCR } from '@paddleocr/paddleocr-js';

import * as ort from 'onnxruntime-web';

// Variável global do Worker para guardar a instância da IA na memória RAM (Singleton)
let ocrEngineInstance: any = null;

// Função auxiliar para carregar o modelo ONNX apenas UMA VEZ (Lazy Warm-up)
async function getOcrEngine() {
  if (!ocrEngineInstance) {
    console.log("[Worker] Inicializando modelos ONNX/PaddleOCR via WebAssembly...");
    
    // Aqui acontecerá o carregamento dos arquivos .onnx via @paddleocr/paddleocr-js
    // ocrEngineInstance = await createPaddleOCR(); 
    
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
      const textExtraido = "TEXTO_PROCESSADO_PELA_IA";

      // 3. Devolve a resposta para a Main Thread (React)
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