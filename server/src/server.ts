import { fastify } from 'fastify'
import { app } from './app'

app.listen({ port: 3001, host: '0.0.0.0' }).then(() => {
  console.log('Servido on fire http://localhost:3001')
  console.log('Swagger docs available at http://localhost:3001/docs')
})
