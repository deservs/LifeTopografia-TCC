import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";

import Home from "./container/Home/home";

const Cadastrar = lazy(() => import("./container/Auth/cadastrar"));
const Login = lazy(() => import("./container/Auth/login"));
const CheckSession = lazy(() => import("./container/Auth/checar"));

const Pagamento = lazy(() => import("./components/Pop-Up/Pagamento/pagamento"));
const Services = lazy(() => import("./container/Services/services"));
const Profile = lazy(() => import("./container/Profile/profile"));
const Teste = lazy(() => import("./container/Enviar-arquivos/enviar_arquivos"));
const Teste2 = lazy(() => import("./container/Enviar-arquivos/enviar_email"));
const Erro404 = lazy(() => import("./container/Error/erro404"));
const Chat = lazy(() => import("./container/Chat/chat"));
const FAQ = lazy(() => import("./container/FAQ/faq"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div aria-busy="true">Carregando...</div>}>
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
          <Route path="/pagamento" element={<Pagamento />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/teste" element={<Teste />} />
          <Route path="/teste2" element={<Teste2 />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/FAQ" element={<FAQ />} />
          <Route path="*" element={<Erro404 />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
