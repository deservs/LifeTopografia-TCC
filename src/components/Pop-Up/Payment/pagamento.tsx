import "./pagamento.css";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    SumUpCard: any;
  }
}

export default function Pagamento(/* {idPedido, valorPedido}: {idPedido: string, valorPedido: number} */) {
  /* const [checkoutID, setCheckoutID] = useState<string | null>("2ceffb63-cbbe-4227-87cf-0409dd191a98"); */
  const checkoutID = "2ceffb63-cbbe-4227-87cf-0409dd191a98"; // Replace with your actual checkout ID

 /*  useEffect(() => {
    async function fetchCheckoutID() {
      try {
        const response = await fetch("/api/sumup/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idPedido,
            valorPedido,
          }),
        });
        const data = await response.json();
        setCheckoutID(data.checkoutID);
      } catch (error) {
        console.error("Error fetching checkout ID:", error);
      }
    }
    fetchCheckoutID();
  }, [idPedido, valorPedido]); */

  useEffect(() => {
    if (checkoutID && window.SumUpCard) {
      window.SumUpCard.mount({
        checkoutId: checkoutID,
        onResponse: function (type: string, body: any ){
          if (type === "success") {
            console.log("Payment successful:", body);
          }
        }
      })
    }
  }, [checkoutID]);

  return (
    <div id="sumup-card"></div>
  );
}
