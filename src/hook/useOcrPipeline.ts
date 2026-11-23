import { PaddleOCR } from "@paddleocr/paddleocr-js";
import {
  PdfpageToImage,
  getPdfPageCount,
  extrairTextoNativoPaginas,
  normalizarPageRanges,
  type PageRange,
} from "../utils/pdfConvert";
import { extrairInformacoes } from "../utils/textSanitizer";
import { useCallback, useRef, useState, useEffect } from "react";

export type StatusProcesso = "idle" | "carregando" | "sucesso" | "erro";
export type MetodoExtracao = "nativo" | "ocr" | null;

export interface OpcoesPipelineOcr {
  pageRanges: PageRange[];
  expectedLotsCount: number;
  forcarOcr?: boolean;
}

export interface OcrPipelineResult {
  status: StatusProcesso;
  progresso: string;
  metodoExtracao: MetodoExtracao;
  textExtraido: string | null;
  executarTarefa: (
    dados: File,
    opcoes: OpcoesPipelineOcr,
  ) => Promise<string | undefined>;
  limpar: () => void;
}

export default function useOcrPipeline(): OcrPipelineResult {
  const [status, setStatus] = useState<StatusProcesso>("idle");
  const [progresso, setProgresso] = useState<string>("");
  const [metodoExtracao, setMetodoExtracao] = useState<MetodoExtracao>(null);
  const [textExtraido, setTextExtraido] = useState<string | null>(null);

  const ocrEngineRef = useRef<Awaited<
    ReturnType<typeof PaddleOCR.create>
  > | null>(null);
  const statusRef = useRef(false);

  const limparMotor = useCallback(async () => {
    const instancia = ocrEngineRef.current;
    ocrEngineRef.current = null;
    if (instancia) {
      try {
        await instancia.dispose();
      } catch (e) {
        console.warn("Aviso ao liberar motor OCR:", e);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      void limparMotor().catch((error) => {
        console.error(
          "Erro ao limpar o motor OCR na desmontagem do componente:",
          error,
        );
      });
    };
  }, [limparMotor]);

  const limpar = useCallback(() => {
    setStatus("idle");
    setProgresso("");
    setMetodoExtracao(null);
    setTextExtraido(null);
  }, []);

  const executarTarefa = useCallback(
    async (
      dados: File,
      opcoes: OpcoesPipelineOcr,
    ): Promise<string | undefined> => {
      if (statusRef.current) {
        console.warn("Processo já em andamento. Aguarde a conclusão.");
        return;
      }

      if (!opcoes || !opcoes.pageRanges || opcoes.pageRanges.length === 0) {
        throw new Error(
          "Intervalos de páginas (pageRanges) são obrigatórios para a extração.",
        );
      }

      if (
        opcoes.expectedLotsCount === undefined ||
        opcoes.expectedLotsCount < 1
      ) {
        throw new Error(
          "Quantidade esperada de terrenos (expectedLotsCount >= 1) é obrigatória.",
        );
      }

      const forcarOcr = opcoes.forcarOcr ?? false;

      try {
        statusRef.current = true;
        setStatus("carregando");
        setProgresso("Analisando estrutura do PDF...");

        const totalPaginas = await getPdfPageCount(dados);
        const paginasAlvo = normalizarPageRanges(
          opcoes.pageRanges,
          totalPaginas,
        );

        if (paginasAlvo.length === 0) {
          throw new Error("Nenhuma página válida selecionada para leitura.");
        }

        // 1. TENTATIVA COM EXTRAÇÃO NATIVA (somente se não foi forçado OCR)
        if (!forcarOcr) {
          try {
            setProgresso(
              `Lendo texto nativo de ${paginasAlvo.length} página(s)...`,
            );
            const resultadoNativo = await extrairTextoNativoPaginas(
              dados,
              paginasAlvo,
            );

            if (
              resultadoNativo.foiNativo &&
              resultadoNativo.texto.trim().length > 30
            ) {
              const dadosIdentificados = extrairInformacoes(
                resultadoNativo.texto,
              );

              // Valida se a extração nativa encontrou o memorial real ou apenas carimbo/metadados
              const temDadosSuficientes =
                dadosIdentificados.coordenadas.length >= 3 ||
                dadosIdentificados.medidas.length >= 2;

              if (temDadosSuficientes) {
                console.log(
                  `Texto nativo validado com sucesso (${resultadoNativo.paginasProcessadas.length} página(s)):`,
                  dadosIdentificados.formatoDescricao,
                  `${dadosIdentificados.coordenadas.length} coords, ${dadosIdentificados.medidas.length} medidas.`,
                );
                setTextExtraido(resultadoNativo.texto);
                setMetodoExtracao("nativo");
                setProgresso(
                  `Concluído via leitura nativa (${resultadoNativo.paginasProcessadas.length} página(s): ${paginasAlvo.join(", ")}).`,
                );
                setStatus("sucesso");
                return resultadoNativo.texto;
              } else {
                console.log(
                  "Texto nativo insuficiente ou apenas carimbo/cabeçalho. Alternando para OCR visual com PaddleOCR.",
                );
              }
            }
          } catch (erroNativo) {
            console.warn(
              "Extração nativa falhou ou PDF é escaneado, alternando para OCR:",
              erroNativo,
            );
          }
        }

        // 2. OCR LOCAL (PADDLEOCR)
        setMetodoExtracao("ocr");
        setProgresso("Inicializando motor OCR local (PaddleOCR)...");

        let ocrEngineInstance = ocrEngineRef.current;
        if (!ocrEngineInstance) {
          ocrEngineInstance = await PaddleOCR.create({
            lang: "pt",
            ocrVersion: "PP-OCRv6",
            worker: true,
            textDetectionModelAsset: {
              url: "/models/ocr/PP-OCRv6_small_det_onnx_infer.tar",
            },
            textDetectionModelName: "PP-OCRv6_small_det",
            textRecognitionModelAsset: {
              url: "/models/ocr/PP-OCRv6_small_rec_onnx_infer.tar",
            },
            textRecognitionModelName: "PP-OCRv6_small_rec",
            ortOptions: {
              wasmPaths: {
                wasm: "/wasm/ort-wasm-simd-threaded.jsep.wasm",
              } as unknown as string,
            },
          });
          ocrEngineRef.current = ocrEngineInstance;
        }

        const paginasOcr = paginasAlvo;
        const textosPaginas: string[] = [];

        for (let i = 0; i < paginasOcr.length; i++) {
          const numPag = paginasOcr[i];
          setProgresso(
            `Processando OCR da página ${numPag} (${i + 1} de ${paginasOcr.length})...`,
          );

          const image = await PdfpageToImage(dados, numPag);
          const result = await ocrEngineInstance.predict(image);

          const textoPagina = result
            .flatMap((item) => item.items.map((registro) => registro.text))
            .join("\n");

          if (textoPagina.trim()) {
            textosPaginas.push(
              `--- PÁGINA ${numPag} ---\n${textoPagina.trim()}`,
            );
          }
        }

        const textFinal = textosPaginas.join("\n\n");

        if (!textFinal.trim()) {
          throw new Error("Nenhum texto pôde ser reconhecido no documento.");
        }

        setTextExtraido(textFinal);
        setProgresso(
          `OCR concluído com sucesso (${paginasOcr.length} página(s) processadas).`,
        );
        setStatus("sucesso");
        return textFinal;
      } catch (error) {
        console.error("Erro no pipeline OCR:", error);
        setProgresso("Falha durante o processamento do PDF.");
        setStatus("erro");
        throw error;
      } finally {
        try {
          await limparMotor();
        } catch (cleanupError) {
          console.error(
            "Erro ao limpar a instância do motor OCR:",
            cleanupError,
          );
        } finally {
          statusRef.current = false;
        }
      }
    },
    [limparMotor],
  );

  return {
    status,
    progresso,
    metodoExtracao,
    textExtraido,
    executarTarefa,
    limpar,
  };
}
