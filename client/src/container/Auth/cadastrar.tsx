import { input } from 'zod';
import { PdfpageToImage } from '../../utils/pdfConvert';

// Dentro do seu componente React:
const handleTestUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  console.log("1. Arquivo recebido:", file.name, `(${file.size} bytes)`);

  try {
    console.time("Tempo de Renderização do Canvas");
    
    // Invoca a função que acabamos de fechar
    const imageData = await PdfpageToImage(file, 1);
    
    console.timeEnd("Tempo de Renderização do Canvas");

    // Validações no Console
    console.log("2. Largura do Canvas:", imageData.width, "px");
    console.log("3. Altura do Canvas:", imageData.height, "px");
    console.log("4. Tamanho da Matriz de Pixels (RAM):", imageData.data.length, "bytes");
    console.log("5. ByteLength do Buffer:", imageData.data.buffer.byteLength, "bytes");

  } catch (error) {
    console.error("ERRO NO TESTE DO PDF:", error);
  }
};
export default function Auth() {
    return (
        <input type="file" accept="application/pdf" onChange={handleTestUpload} />
    );
}