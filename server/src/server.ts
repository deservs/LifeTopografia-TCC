<<<<<<< HEAD
import { fastify } from 'fastify'
import { app } from './app'

app.listen({ port: 3001, host: '0.0.0.0' }).then(() => {
  console.log('Servido on fire http://localhost:3001')
  console.log('Swagger docs available at http://localhost:3001/docs')
})
=======
import { app } from './app'
import { env } from './env'

app
  .listen({
    port: env.PORT,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log(`🚀 Servidor rodando no ambiente [${env.NODE_ENV}]`)
    console.log(`🌐 http://localhost:${env.PORT}`)
  })
>>>>>>> envio-de-arquivos
