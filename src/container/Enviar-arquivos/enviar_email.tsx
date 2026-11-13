export default function sendEmail() {
  const handleSendEmail = async () => {
    const from = (document.getElementById("email") as HTMLInputElement).value;
    try {
      const response = await fetch("http://localhost:3001/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from }),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar email");
      }

      const data = await response.json();
      console.log("Email enviado com sucesso:", data);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    }
  };
  return (
    <div>
      <h1>Enviar Email</h1>
      <input id="email" type="text" placeholder="Digite o email" />
      <button onClick={handleSendEmail}>Enviar</button>
    </div>
  );
}
