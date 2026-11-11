import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";

import Home from "./container/Home/home";

import Cadastrar from "./container/Auth/cadastrar";
import Login from "./container/Auth/login";
import Logout from "./container/Auth/logout";
import CheckSession from "./container/Auth/checar";

import Services from "./container/Services/services";
import Profile from "./container/Profile/profile";
import Teste from "./container/Enviar-arquivos/enviar_arquivos";
import Erro404 from "./components/Pop-Up/Error/erro404";
import Chat from "./container/Chat/chat"; // <- Importe o componente do chat
import FAQ from "./container/FAQ/faq";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/cadastrar"
          element={
            <>
              <CheckSession />
              <Cadastrar />
            </>
          }
        />
        <Route
          path="/login"
          element={
            <>
              <CheckSession />
              <Login />
            </>
          }
        />
        <Route path="/servicos" element={<Services />} />
        <Route path="/teste" element={<Teste />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/FAQ" element={<FAQ />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="*"
          element={
            <>
              <Home />
              <Erro404 />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
