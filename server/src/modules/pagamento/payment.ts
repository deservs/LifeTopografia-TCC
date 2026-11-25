import { MercadoPagoConfig, PaymentMethod } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: 'access_token' })
const paymentMethods = new PaymentMethod(client)

paymentMethods
  .get()
  .then((result) => console.log(result))
  .catch((error: unknown) => console.log(error))
