import './pagamento.css';
import SumUp from '@sumup/sdk'

export default function Pagamento() {
  return (
    <div className="popup">
      <div className="popup-content">
        <h2>Pagamento</h2>
        <p>O pagamento foi realizado com sucesso!</p>
        <button onClick={() => window.location.reload()}>Fechar</button>
      </div>
    </div>
  );
}