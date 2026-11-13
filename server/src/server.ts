import { app } from './app.js'
import { env } from './config/env.js'

app
  .listen({
    port: env.PORT,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log(`🚀 Servidor rodando no ambiente [${env.NODE_ENV}]`)
    console.log(`🌐 http://localhost:${env.PORT}`)
  })
