// src/workers/ocr.worker.ts
import * as ort from 'onnxruntime-web';

// Regra vital: Força o ONNX a buscar os binários WebAssembly na pasta pública,
// caso contrário, o Vite tentará empacotar tudo no build final e quebrará o sistema.
ort.env.wasm.wasmPaths = '/wasm/';

self.onmessage = async (event: MessageEvent) => {
  const { action, imageData } = event.data;

  if (action === 'INICIAR_INFERENCIA') {
    try {
      // 1. Aqui entrará a lógica de transformação do ImageData em Tensor
      // 2. A execução da sessão ONNX
      // 3. O retorno do texto

      self.postMessage({ status: 'sucesso', texto: 'Texto extraído do ONNX' });
    } catch (erro) {
      self.postMessage({ status: 'erro', mensagem: String(erro) });
    }
  }
};