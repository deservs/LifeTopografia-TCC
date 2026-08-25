// src/lib/ocr/usePaddle.ts
import { useState, useEffect, useCallback } from 'react';
import { PaddleOCR } from '@paddleocr/paddleocr-js';

export function usePaddle() {
  const [engine, setEngine] = useState<any>(null);
  const [status, setStatus] = useState<'ocioso' | 'carregando_modelo' | 'pronto' | 'processando' | 'erro'>('ocioso');
  const [erroFatal, setErroFatal] = useState<string | null>(null);

  // Inicializa o motor apenas uma vez quando o componente é montado
  useEffect(() => {
    let montado = true;

    const inicializarIA = async () => {
      try {
        setStatus('carregando_modelo');
        
        // Inicializa o motor com Worker nativo da biblioteca
        const ocr = await PaddleOCR.create({
          lang: "en", // "en" ou "latin", nunca "ch" para o seu caso
          ocrVersion: "PP-OCRv5",
          worker: true,
          ortOptions: {
            backend: "wasm",
            wasmPaths: `${window.location.origin}/wasm/`, // Certifique-se de que os .wasm estão na pasta public/wasm/
            numThreads: 2,
            simd: true
          }
        });

        if (montado) {
          setEngine(ocr);
          setStatus('pronto');
        }
      } catch (erro: any) {
        if (montado) {
          setStatus('erro');
          setErroFatal(erro.message || 'Falha catastrófica ao carregar ONNX');
        }
      }
    };

    inicializarIA();

    // Cleanup: tenta destruir a instância caso o usuário feche a página antes de terminar
    return () => {
      montado = false;
      if (engine) {
        try { engine.terminate(); } catch (e) { /* Ignora erros de destruição */ }
      }
    };
  }, []);

  // Função que a interface vai chamar para processar a imagem
  const lerTexto = useCallback(async (elementoImagem: HTMLImageElement | HTMLCanvasElement) => {
    if (!engine) throw new Error("A IA ainda não terminou de carregar.");
    
    setStatus('processando');
    try {
      // A biblioteca aceita elementos de imagem ou canvas nativos do DOM
      const resultado = await engine.recognize(elementoImagem);
      setStatus('pronto');
      
      // Retorna o array de blocos de texto encontrados
      return resultado; 
    } catch (erro: any) {
      setStatus('erro');
      setErroFatal(erro.message || 'Falha ao processar a imagem');
      throw erro;
    }
  }, [engine]);

  return { lerTexto, status, erroFatal, isPronto: status === 'pronto' };
}