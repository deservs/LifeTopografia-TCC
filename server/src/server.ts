import { app } from './app'
import { env } from './config/env'

app
  .listen({
    port: env.PORT,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log(`🚀 Servidor rodando no ambiente [${env.NODE_ENV}]`)
    console.log(`🌐 http://localhost:${env.PORT}`)
  })
