import { MercadoPagoConfig, PaymentMethods } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: 'access_token' })
const paymentMethods = new PaymentMethods(client)

paymentMethods
  .get()
  .then((result) => console.log(result))
  .catch((error) => console.log(error))
