import  useOcrPipeline  from '../../hook/useOcrPipeline';
import type { ChangeEvent } from 'react';

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
      
      // Invoca a função que acabamos de fechar
      
      console.timeEnd("Tempo de Renderização do Canvas");
  
      console.log("2. Dados da imagem extraídos do PDF:", ocrPipeline.executarTarefa(file));
  
    } catch (error) {
      console.error("ERRO NO TESTE DO PDF:", error);
    }
  };
    return (
        <input type="file" accept="application/pdf" onChange={handleTestUpload} />
    );
}