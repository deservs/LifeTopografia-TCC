import { useCallback, useEffect, useRef, useState } from 'react'

type StatusProcesso = 'idle' | 'carregando' | 'sucesso' | 'erro';

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

const executarTarefa = useCallback(async (dados: ArrayBuffer) =>{
    //impedir que o usuario inicie mais de um worker
    finalizarWorker();
    setStatus('carregando');

    const worker = new Worker(
        new URL('../workers/ocr.worker.ts', import.meta.url)
    )
});