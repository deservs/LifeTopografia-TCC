import { useState, type ChangeEvent } from 'react'
import { createAuthenticatedSupabaseClient } from '../../server/banco'
import { DxfViewer } from 'dxf-viewer'
import * as THREE from 'three'

export default function EnviarArquivos() {  // 1. Estado para guardar o arquivo selecionado
    const [file, setFile] = useState<File | null>(null) // Estado para guardar a letra digitada

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
            document.getElementById('div')!.style.color = 'transparent' // Muda a cor da letra para transparente em caso de sucesso

            // Salva a resposta no localStorage do navegador (client-side)
            localStorage.setItem('dxfData', JSON.stringify(result))

            // Pega a `<div>` da tela onde o desenho vai aparecer
            const container = document.getElementById('cad-preview')

            if (!container) {
                throw new Error('Container de visualização não encontrado')
            }

            // Instancia o visualizador
            const viewer = new DxfViewer(container, {
                autoResize: true,
                canvasWidth: 800,
                canvasHeight: 600,
                clearColor: new THREE.Color(0x111111), // Cor de fundo estilo AutoCAD (escuro)
            })

            // Pega o arquivo do seu backend e manda renderizar
            async function carregarDesenho(urlDoDxf: string) {
                console.log('Carregando desenho do DXF em:', urlDoDxf)
                await viewer.Load({ url: urlDoDxf })
            }
            
            const fileUrl = 'http://localhost:3001/ver' // URL do endpoint backend que fornece o conteúdo do DXF
            await carregarDesenho(fileUrl) // Ajuste a URL conforme seu backend
        } catch (error) {
            console.error('Erro ao enviar o arquivo:', error)
            document.getElementById('div')!.style.color = 'red' // Muda a cor da letra para vermelho em caso de erro
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
            <div id='div' style={{ color: 'transparent' }}>Bixo tem algo errado</div>
            <div>
                <div><button>cancelar</button></div>
                <div><button>enviar</button></div>
            </div>
            <div id={'cad-preview'} className="cad-preview" style={{ width: '100%', height: '600px', position: 'relative' }}></div>
        </>
    )
}
/* async function EnviarArquivos() {

            const result = await response.json()

            const authToken = 'token-de-autenticacao'

            const supabase = createAuthenticatedSupabaseClient(authToken) // Substitua pelo token real do usuário

            // Pega a URL pública do arquivo DXF no Storage
            const { data, error } = await supabase.storage
                .from('arquivos')
                .createSignedUrl('cad/' + result.file.path, 60)
            if (error || !data?.signedUrl) {
                throw new Error(`Erro ao obter URL do Supabase: ${error?.message}`)
            }
            const fileUrl = data.signedUrl
} */