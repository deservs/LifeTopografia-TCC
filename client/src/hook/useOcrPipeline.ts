import { PdfpageToImage } from '../utils/pdfConvert';
import { useCallback, useEffect, useRef, useState } from 'react'

type StatusProcesso = 'idle' | 'carregando' | 'sucesso' | 'erro';

export default function useOcrPipeline() {
const [status, setStatus] = useState<StatusProcesso>('idle');

const workerRef = useRef<Worker | null>(null);

// processo para finalizar o worker
const finalizarWorker = useCallback(() => {
    if (workerRef.current) {
        //comando que finaliza
        workerRef.current.terminate();
        workerRef.current = null;
    }
    setStatus('idle');
},[]);

// processo que garante que será finalizado
useEffect(() => {
    return () => {
        finalizarWorker();
    };
}, [finalizarWorker]);

const executarTarefa = useCallback(async (dados: File) =>{
    //impedir que o usuario inicie mais de um worker
    finalizarWorker();
    setStatus('carregando');
    const image = await PdfpageToImage(dados, 1);
    const imgBuffer = image.data.buffer;
    const imgwidth = image.width;
    const imgheight = image.height;

    const worker = new Worker(
        new URL('../workers/ocr.worker.ts', import.meta.url),
        { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
        if (event.data.status === 'sucesso') {
            setStatus('sucesso');
        }
        if (event.data.status === 'erro') {
            setStatus('erro');
        }
        console.log('Mensagem recebida do worker:', event.data);
        finalizarWorker();
    };

    worker.onerror = (error) => {
        console.error('Erro no worker:', error);
        setStatus('erro');
        finalizarWorker();
    }
    worker.postMessage({dados}, [dados]);
},[finalizarWorker]);
return { status, executarTarefa, finalizarWorker};
}