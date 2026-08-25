// src/container/Enviar-arquivos/enviar_arquivos.tsx
import React, { useRef, useState } from 'react';
import { usePaddle } from './ocr.worker'; // Importa seu Motor

export default function EnviarArquivos() {
  // Conecta a interface com a IA
  const { lerTexto, status, erroFatal, isPronto } = usePaddle();
  
  const [textoExtraido, setTextoExtraido] = useState<string>('');
  const imagemRef = useRef<HTMLImageElement>(null);

  // Simulação de fluxo (na prática, aqui entrará o Canvas do pdf.js)
  const executarOCR = async () => {
    if (!imagemRef.current) return;
    
    try {
      setTextoExtraido('');
      const resultado = await lerTexto(imagemRef.current);
      
      // O PaddleOCR devolve um objeto complexo. Precisamos varrer o resultado para pegar as strings.
      // A estrutura exata depende da versão do wrapper, geralmente está em result.textLines ou similar.
      const linhas = resultado.textLines ? resultado.textLines.map((linha: any) => linha.text).join('\n') : JSON.stringify(resultado);
      
      setTextoExtraido(linhas);
    } catch (erro) {
      console.error(erro);
    }
  };

  return (
    <div className="painel-upload">
      <h2>Processador de Documentos Sigilosos</h2>
      
      {/* HUD de Status do Sistema */}
      <div className="status-box">
        {status === 'carregando_modelo' && <p>Carregando IA na placa de vídeo (Aguarde...)</p>}
        {status === 'processando' && <p>Extraindo texto (O navegador não vai travar!)</p>}
        {status === 'erro' && <p style={{ color: 'red' }}>Erro Crítico: {erroFatal}</p>}
        {status === 'pronto' && <p style={{ color: 'green' }}>IA Pronta para uso.</p>}
      </div>

      {/* Exemplo de imagem para leitura */}
      <div className="preview-container">
        <img 
          ref={imagemRef} 
          src="/exemplo-contrato.png" // Uma imagem de teste na sua pasta public
          alt="Documento para Leitura" 
          style={{ maxWidth: '300px', display: 'block', marginBottom: '10px' }}
        />
        
        {/* O botão fica desabilitado até a IA estar carregada em RAM */}
        <button 
          onClick={executarOCR} 
          disabled={!isPronto || status === 'processando'}
        >
          {status === 'processando' ? 'Lendo...' : 'Iniciar Leitura'}
        </button>
      </div>

      {/* Resultado */}
      {textoExtraido && (
        <div className="resultado">
          <h3>Texto Encontrado:</h3>
          <pre>{textoExtraido}</pre>
        </div>
      )}
    </div>
  );
}