import { useState, ChangeEvent } from 'react'

export default function EnviarArquivos() {  // 1. Estado para guardar o arquivo selecionado
    const [file, setFile] = useState<File | null>(null)
    const [letra, setLetra] = useState<string>('transparent') // Estado para guardar a letra digitada

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

            if (!response.ok) {
                const errorBody = await response.text()
                throw new Error(`Upload falhou (${response.status}): ${errorBody}`)
            }

            const result = await response.json()
            console.log('Resposta do servidor:', result)
            setLetra('transparent') // Muda a cor da letra para transparente em caso de sucesso
        } catch (error) {
            console.error('Erro ao enviar o arquivo:', error)
            setLetra('red') // Muda a cor da letra para vermelho em caso de erro

        }
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                {/* O onChange captura a seleção do arquivo */}
                <input type="file" onChange={handleFileChange} />

                {/* O onClick envia o arquivo salvo no state */}
                <button onClick={enviarArquivo}>Enviar Arquivo</button>
            </div>
            <div id='div' style={{ color: letra }}>Bixo tem algo errado</div>
        </>
    )
}