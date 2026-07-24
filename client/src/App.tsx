import { useState, ChangeEvent } from 'react'
import './App.css'

function App() {
  // 1. Estado para guardar o arquivo selecionado
  const [file, setFile] = useState<File | null>(null)

  // 2. Função acionada quando o usuário escolhe um arquivo no <input>
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
    }
  }

  // 3. Função acionada quando clica no botão de enviar
  async function enviarArquivo() {
    if (!file) {
      alert('Por favor, selecione um arquivo primeiro!')
      return
    }

    console.log('Enviando arquivo...', file.name)

    const formData = new FormData()
    formData.append('file', file) // 'file' é a chave esperada pelo Fastify

    try {
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData, // O navegador define o Content-Type multipart/form-data automaticamente
      })

      const result = await response.json()
      console.log('Resposta do servidor:', result)
    } catch (error) {
      console.error('Erro ao enviar o arquivo:', error)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
      {/* O onChange captura a seleção do arquivo */}
      <input type="file" onChange={handleFileChange} />
      
      {/* O onClick envia o arquivo salvo no state */}
      <button onClick={enviarArquivo}>Enviar Arquivo</button>
    </div>
  )
}

export default App