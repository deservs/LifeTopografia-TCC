import {
  CardNumber,
  ExpirationDate,
  initMercadoPago,
} from "@mercadopago/sdk-react";

import "./pagamento.css";

const apiKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function Pagamento() {
  initMercadoPago(apiKey);

  return (
    <>
      <title>Pagamento - Life Topografia</title>
      <meta
        name="description"
        content="Realize o pagamento do seu serviço com segurança na Life Topografia."
      />
      <div className="card">
        <CardNumber placeholder="sdadsada" />
        <ExpirationDate placeholder="sdadsada" />
      </div>
    </>
  );
}
