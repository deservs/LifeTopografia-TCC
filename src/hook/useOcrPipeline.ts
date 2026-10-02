import { PaddleOCR } from "@paddleocr/paddleocr-js";
import { PdfpageToImage } from "../utils/pdfConvert";
import { useCallback, useRef, useState, useEffect } from "react";

type StatusProcesso = "idle" | "carregando" | "sucesso" | "erro";

export default function useOcrPipeline() {
  const [status, setStatus] = useState<StatusProcesso>("idle");
  const ocrEngineRef = useRef<Awaited<
    ReturnType<typeof PaddleOCR.create>
  > | null>(null);
  const statusRef = useRef(false);

  const limparMotor = useCallback(async () => {
    const instancia = ocrEngineRef.current;
    ocrEngineRef.current = null;
    if (instancia) {
      await instancia.dispose();
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

  const executarTarefa = useCallback(async (dados: File) => {
    if (statusRef.current) {
      console.warn("Processo já em andamento. Aguarde a conclusão.");
      return;
    }
    // Variável para armazenar a instância do motor OCR
    let ocrEngineInstance: Awaited<ReturnType<typeof PaddleOCR.create>> | null =
      ocrEngineRef.current;
    try {
      statusRef.current = true;
      setStatus("carregando");
      ocrEngineInstance = await PaddleOCR.create({
        lang: "pt",
        ocrVersion: "PP-OCRv6",
        worker: true,
        textDetectionModelAsset: {url: "/models/ocr/PP-OCRv6_small_det_onnx_infer.tar"},
        textDetectionModelName: "PP-OCRv6_small_det",
        textRecognitionModelAsset: {url: "/models/ocr/PP-OCRv6_small_rec_onnx_infer.tar"},
        textRecognitionModelName: "PP-OCRv6_small_rec",
        ortOptions: {
          // O SDK aceita apenas string no tipo, mas encaminha o objeto suportado pelo ONNX Runtime.
          // Informar só o WASM usa o módulo JS já embutido no worker.
          wasmPaths: { wasm: "/wasm/ort-wasm-simd-threaded.jsep.wasm" } as unknown as string,
        }
      });
      ocrEngineRef.current = ocrEngineInstance;
      const image = await PdfpageToImage(dados, 1);

      await ocrEngineInstance.predict(image).then((result) => {
        const textExtraido = result
          .flatMap((item) => item.items.map((registro) => registro.text))
          .join("\n");
        console.log("Texto extraído:", textExtraido);
      });
      setStatus("sucesso");
    } catch (error) {
      console.error("Erro no pipeline OCR:", error);
      setStatus("erro");
    } finally {
      // Teste defensivo para garantir que a instância do motor OCR seja limpa corretamente
      try {
        // Limpeza da instância do motor OCR para liberar memória
        await limparMotor();
      } catch (cleanupError) {
        console.error("Erro ao limpar a instância do motor OCR:", cleanupError);
      } finally {
        statusRef.current = false;
      }
    }
  }, [limparMotor]);
  return { status, executarTarefa };
}
