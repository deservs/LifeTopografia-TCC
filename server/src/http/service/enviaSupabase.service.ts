import type { FastifyInstance } from 'fastify'
import { createAuthenticatedSupabaseClient } from '../../repositories/banco'
import { date } from 'zod'

export async function SendToSupabaseService(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  authToken: string,
) {
  const userID = Date.now().toString() // Substitua pelo ID do usuário autenticado
  // Cria um cliente autenticado do Supabase
  const supabase = createAuthenticatedSupabaseClient(authToken)

  // Envia o arquivo para o Supabase
  const { data, error } = await supabase.storage
    .from('arquivos/' + fileType + '/' + userID)
    .upload(fileName, fileBuffer)

  if (error) {
    console.error('Erro no Supabase Storage:', error)
    throw new Error('Falha ao salvar o arquivo no storage.')
  }

  return userID + '/' + fileName // Retorna o caminho do arquivo no Supabase
}
