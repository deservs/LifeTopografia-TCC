/* import type { FastifyInstance } from 'fastify'
import path from 'path'
import { createAuthenticatedSupabaseClient } from '../../repositories/banco'

export async function uploadRoute(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    const supabase = createAuthenticatedSupabaseClient(authHeader)

    // Extrai o arquivo da requisição
    const data = await request.file()
    // Se o usuário enviou o formulário sem anexar arquivo
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })
    }

    // Informações úteis que você recebe do arquivo:
    console.log('Nome do arquivo:', data.filename)
    console.log('Tipo (MIME):', data.mimetype)
    console.log('Conteúdo em Buffer/Stream:', data.file)

    /* 
      AQUI VOCÊ PODE:
      1. Enviar o arquivo para o Supabase Storage
      2. Salvar no disco local
      3. Processar em memória
      
    
    //Transforma o arquivo em Buffer (necessário para o Node.js)
    const fileBuffer = await data.toBuffer()
    // Gera um nome único para evitar sobrescrever arquivos com o mesmo nome
    const fileExtension = path.extname(data.filename)
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`

    const filePath = `pdf/${uniqueFileName}`

    const { data: uploadData, error } = await supabase.storage
      .from('arquivos') // Subsitua pelo nome do seu Bucket no Supabase
      .upload(filePath, fileBuffer, {
        contentType: data.mimetype, // Define se é pdf, png, dwg, etc.
        upsert: false, // false = não sobrescreve se já existir
      })

    // 5. Trata erros do Supabase
    if (error) {
      console.error('Erro no Supabase Storage:', error)
      return reply.status(500).send({ error: 'Falha ao salvar o arquivo no storage.' })
    }

    // 6. Sucesso! Retorna o caminho do arquivo criado
    return reply.status(201).send({
      message: 'Upload realizado com sucesso!',
      path: uploadData.path,
    })
  })
}
 */
