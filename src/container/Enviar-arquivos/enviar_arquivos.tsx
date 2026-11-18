import useOcrPipeline from "../../hook/useOcrPipeline";
import type { ChangeEvent } from "react";
import { extrairInformacoes } from "../../utils/textSanitizer";

export default function Teste() {
  // Chamada inicial para configurar o hook
  const ocrPipeline = useOcrPipeline();
  console.log("OCR Pipeline configurado:", ocrPipeline);

  // Dentro do seu componente React:
  const handleTestUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("1. Arquivo recebido:", file.name, `(${file.size} bytes)`);

    try {
      console.time("Tempo de Renderização do Canvas");
      
      const resultado = await ocrPipeline.executarTarefa(file);

      console.log(
        "2. Dados da imagem extraídos do PDF:",
        resultado,
      );


      const terreno = extrairInformacoes(resultado);

      console.log("Informações extraídas:", terreno);
      console.log("Informações:", terreno.medidas);
      console.timeEnd("Tempo de Renderização do Canvas");
    } catch (error) {
      console.error("ERRO NO TESTE DO PDF:", error);
    }
  };
  return (
    <>
      <input type="file" accept="application/pdf" onChange={handleTestUpload} />
    </>
  );
}
