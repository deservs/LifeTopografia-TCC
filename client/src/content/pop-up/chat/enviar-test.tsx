import { useEffect, useRef, useState } from 'react';

export default function EnviarArquivos() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<string>('Aguardando arquivo');

  useEffect(() => {
    // Instancia o Worker de forma compatível com o bundler do Vite
    workerRef.current = new Worker(
      new URL('../../workers/ocr.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Escuta as respostas vindas da thread secundária
    workerRef.current.onmessage = (event) => {
      if (event.data.status === 'sucesso') {
        setStatus(`Finalizado: ${event.data.texto}`);
      } else {
        setStatus(`Erro fatal: ${event.data.mensagem}`);
      }
    };

    // Prevenção de vazamento de memória (Memory Leak)
    return () => workerRef.current?.terminate();
  }, []);

  const iniciarProcessamento = () => {
    setStatus('Processando em background...');
    // O envio real exigirá o array de pixels do PDF
    workerRef.current?.postMessage({ action: 'INICIAR_INFERENCIA', imageData: [] });
  };

  return (
    <div className="painel-ocr">
      <h2>Processador de Documentos</h2>
      <p>Status: <strong>{status}</strong></p>
      <button onClick={iniciarProcessamento}>Rodar OCR</button>
    </div>
  );
}