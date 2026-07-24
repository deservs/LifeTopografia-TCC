import type { FastifyInstance } from 'fastify'
import { createAuthenticatedSupabaseClient } from '../../repositories/banco'

export async function getTabelaRoute(app: FastifyInstance) {
  app.get('/tabela', async (request, reply) => {
    // 1. Pega o token enviado pelo cabeçalho Authorization
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    // 2. Instancia o Supabase passando o token do usuário (para respeitar o RLS)
    const supabase = createAuthenticatedSupabaseClient(authHeader)

    // 3. Faz a consulta na tabela
    const { data, error } = await supabase.from('tabela').select('*')

    // 4. Tratamento de erro
    if (error) {
      return reply.status(400).send({ error: error.message })
    }

    return reply.status(200).send({ data })
  })
}
