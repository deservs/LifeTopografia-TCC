import type { PDFPageProxy } from "pdfjs-dist";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

export async function getPdfArrayBuffer(file: File): Promise<ArrayBuffer> {
  // Converte a referência do arquivo em bytes crus na memória RAM
  return await file.arrayBuffer();
}

export function isMobileOrTablet(): boolean {
  // Testa dispositivos móveis convencionais via User Agent
  const isStandardMobile = /iPhone|iPad|iPod|Android/i.test(
    navigator.userAgent,
  );

  // Captura iPads modernos rodando iPadOS (que fingem ser MacBooks)
  const isIpadosFakeMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  // Validação secundária por ponto de toque e proporção de ecrã
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Retorna verdadeiro se for um dispositivo móvel ou tablet, considerando os casos acima
  return (
    isStandardMobile ||
    isIpadosFakeMac ||
    (isTouchDevice && window.innerWidth <= 1024)
  );
}

export async function PdfpageToImage(
  file: File,
  pageNumber: number = 1,
): Promise<ImageData> {
  const pdfjsLib = await getPdfJs();
  // converter o arquivo em ArrayBuffer
  const arrayBuffer = await getPdfArrayBuffer(file);

  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let page: PDFPageProxy | null = null;
  try {
    // Carrega a estrutura na memória
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    page = await pdfDoc.getPage(pageNumber);

    // Deifine as dimensões do canvas com base na escala
    const scale = isMobileOrTablet() ? 1.0 : 2.0;
    const viewport = page.getViewport({ scale });

    // Intanciar Canvas invisível na main thread
    canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      throw new Error("Não foi possível obter o contexto 2D do Canvas.");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Renderiza a página do PDF no canvas
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    // Retorna os dados da imagem do canvas
    const imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imagedata;
  } catch (error) {
    console.error("Erro ao processar a página do PDF:", error);
    throw error;
  } finally {
    // Limpar o canvas para liberar memória
    if (page) page.cleanup();
    if (loadingTask) await loadingTask.destroy();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

// ======================================================
// EXTRAÇÃO DE TEXTO NATIVO DO PDF (SEM OCR)
// ======================================================

export interface PageRange {
  start: number;
  end: number;
}

/**
 * Valida e converte pageRanges em uma lista ordenada e desduplicada de números de página.
 * Validação estrita: 1 <= start <= end <= totalPages.
 */
export function normalizarPageRanges(
  ranges: PageRange[],
  totalPages: number,
): number[] {
  if (!ranges || ranges.length === 0) {
    throw new Error("Pelo menos um intervalo de páginas deve ser fornecido.");
  }

  if (totalPages < 1) {
    throw new Error("Total de páginas inválido para o documento.");
  }

  const setPags = new Set<number>();

  for (const r of ranges) {
    const start = Math.floor(r.start);
    const end = Math.floor(r.end);

    if (start < 1 || end < start || end > totalPages) {
      throw new Error(
        `Intervalo de páginas inválido: de ${r.start} até ${r.end}. O documento possui ${totalPages} página(s) (exige-se 1 <= início <= fim <= ${totalPages}).`,
      );
    }

    for (let p = start; p <= end; p++) {
      setPags.add(p);
    }
  }

  return Array.from(setPags).sort((a, b) => a - b);
}

/**
 * Retorna o número total de páginas de um PDF.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await getPdfArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const count = pdfDoc.numPages;
  await loadingTask.destroy();
  return count;
}

/**
 * Extrai texto nativo de uma única página do PDF usando getTextContent().
 * Retorna string vazia se a página não contiver texto embutido (PDF escaneado).
 */
export async function extrairTextoNativoPagina(
  file: File,
  pageNumber: number,
): Promise<string> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await getPdfArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdfDoc = await loadingTask.promise;

    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
      return "";
    }

    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();

    // Reconstrói o texto respeitando a ordem e quebras de linha do PDF
    let textoFinal = "";
    let ultimoY: number | null = null;

    for (const item of textContent.items) {
      // Ignora marcações de conteúdo
      if ("type" in item) continue;

      const textItem = item as {
        str: string;
        transform: number[];
        hasEOL: boolean;
      };
      const currentY = textItem.transform[5];

      // Detecta nova linha pela mudança de posição Y
      if (ultimoY !== null && Math.abs(currentY - ultimoY) > 2) {
        textoFinal += "\n";
      } else if (ultimoY !== null) {
        textoFinal += " ";
      }

      textoFinal += textItem.str;

      if (textItem.hasEOL) {
        textoFinal += "\n";
      }

      ultimoY = currentY;
    }

    page.cleanup();
    return textoFinal;
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Extrai texto nativo de uma lista específica de páginas do PDF.
 * Inclui marcadores '--- PÁGINA X ---' entre as páginas para rastreabilidade.
 */
export async function extrairTextoNativoPaginas(
  file: File,
  paginas: number[],
): Promise<{
  texto: string;
  paginasProcessadas: number[];
  textosPorPagina: { pagina: number; texto: string }[];
  foiNativo: boolean;
}> {
  const arrayBuffer = await getPdfArrayBuffer(file);
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdfDoc = await loadingTask.promise;
    const totalPaginas = pdfDoc.numPages;

    const paginasValidas = Array.from(
      new Set(paginas.filter((p) => p >= 1 && p <= totalPaginas)),
    ).sort((a, b) => a - b);

    if (paginasValidas.length === 0) {
      return {
        texto: "",
        paginasProcessadas: [],
        textosPorPagina: [],
        foiNativo: false,
      };
    }

    const textosPorPagina: { pagina: number; texto: string }[] = [];

    for (const numPag of paginasValidas) {
      const page = await pdfDoc.getPage(numPag);
      const textContent = await page.getTextContent();

      let textoPagina = "";
      let ultimoY: number | null = null;

      for (const item of textContent.items) {
        if ("type" in item) continue;

        const textItem = item as {
          str: string;
          transform: number[];
          hasEOL: boolean;
        };
        const currentY = textItem.transform[5];

        if (ultimoY !== null && Math.abs(currentY - ultimoY) > 2) {
          textoPagina += "\n";
        } else if (ultimoY !== null) {
          textoPagina += " ";
        }

        textoPagina += textItem.str;

        if (textItem.hasEOL) {
          textoPagina += "\n";
        }

        ultimoY = currentY;
      }

      textosPorPagina.push({ pagina: numPag, texto: textoPagina.trim() });
      page.cleanup();
    }

    const textoCompleto = textosPorPagina
      .map((p) => `--- PÁGINA ${p.pagina} ---\n${p.texto}`)
      .join("\n\n");

    const totalCaracteres = textosPorPagina.reduce(
      (acc, p) => acc + p.texto.length,
      0,
    );
    const mediaPorPagina = totalCaracteres / paginasValidas.length;
    const foiNativo = mediaPorPagina > 40;

    return {
      texto: foiNativo ? textoCompleto : "",
      paginasProcessadas: paginasValidas,
      textosPorPagina,
      foiNativo,
    };
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Analisa rapidamente o documento procurando páginas que contenham
 * termos ou indícios de descrição de imóveis (coordenadas, azimutes, confrontações, lote, área, etc).
 */
export async function detectarPaginasComDescricao(
  file: File,
): Promise<{ paginasSugeridas: number[]; totalPaginas: number }> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await getPdfArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdfDoc = await loadingTask.promise;
    const totalPaginas = pdfDoc.numPages;
    const paginasSugeridas: number[] = [];

    const termosMemorial = [
      /azimute/i,
      /coordenadas/i,
      /v[eé]rtice/i,
      /per[íi]metro/i,
      /confronta/i,
      /frente\s+para/i,
      /lado\s+direito/i,
      /lateral\s+direita/i,
      /lote\s+n[º°o]?/i,
      /gleba/i,
      /matr[íi]cula/i,
      /metros\s+quadrados/i,
      /\bN\s*[:=]\s*\d+/i,
      /\bE\s*[:=]\s*\d+/i,
    ];

    for (let i = 1; i <= totalPaginas; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const texto = textContent.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ");

      const pontuacao = termosMemorial.filter((regex) =>
        regex.test(texto),
      ).length;
      if (pontuacao >= 2) {
        paginasSugeridas.push(i);
      }
      page.cleanup();
    }

    return { paginasSugeridas, totalPaginas };
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Extrai texto nativo de todas as páginas do PDF.
 * Retorna o texto de cada página concatenado com separadores.
 * Se o texto extraído for muito curto (PDF escaneado), retorna string vazia.
 */
export async function extrairTextoNativoCompleto(
  file: File,
): Promise<{ texto: string; paginasProcessadas: number; foiNativo: boolean }> {
  const total = await getPdfPageCount(file);
  const todas = Array.from({ length: total }, (_, i) => i + 1);
  const res = await extrairTextoNativoPaginas(file, todas);
  return {
    texto: res.texto,
    paginasProcessadas: res.paginasProcessadas.length,
    foiNativo: res.foiNativo,
  };
}
