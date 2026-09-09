import * as pdfjsLib from 'pdfjs-dist';

//configuração do worker para o pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function getPdfArrayBuffer(file: File): Promise<ArrayBuffer> {
  // Converte a referência do arquivo em bytes crus na memória RAM
  return await file.arrayBuffer();
}

export function isMobileOrTablet(): boolean {
  // Testa dispositivos móveis convencionais via User Agent
  const isStandardMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Captura iPads modernos rodando iPadOS (que fingem ser MacBooks)
  const isIpadosFakeMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // Validação secundária por ponto de toque e proporção de ecrã
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Retorna verdadeiro se for um dispositivo móvel ou tablet, considerando os casos acima
  return isStandardMobile || isIpadosFakeMac || (isTouchDevice && window.innerWidth <= 1024);
}

export async function PdfpageToImage( file:File, pageNumber: number = 1): Promise<ImageData>{
    // converter o arquivo em ArrayBuffer
    const arrayBuffer = await getPdfArrayBuffer(file);

    // Carrega a estrutura na memória
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageNumber);

    // Deifine as dimensões do canvas com base na escala
    const scale = isMobileOrTablet() ? 1.0 : 2.0;
    const viewport = page.getViewport({ scale });

    // Intanciar Canvas invisível na main thread
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    
    if (!ctx) {
        throw new Error('Não foi possível obter o contexto 2D do Canvas.');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Renderiza a página do PDF no canvas
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    // Retorna os dados da imagem do canvas
    const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Limpar o canvas para liberar memória
    page.cleanup(); 
    await loadingTask.destroy();
    canvas.width = 0;
    canvas.height = 0;

    return imagedata;
}