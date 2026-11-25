import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import Home from "./container/Home/home";
import About from "./container/About/about";

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

// Carregamento sob demanda de telas secundárias/administrativas.
const Erro404 = lazy(() => import("./container/Error/erro404"));
const AdminCheckUser = lazy(
  () => import("./container/AdminCheckUser/adminCheckUser"),
);

function AdminRouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        color: "#0b50bd",
        fontWeight: 600,
      }}
    >
      Carregando painel administrativo…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/sobre-nos" element={<Navigate to="/sobre" replace />} />
        <Route path="/about" element={<Navigate to="/sobre" replace />} />
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
        <Route path="/faq" element={<FAQ />} />
        <Route path="/FAQ" element={<Navigate to="/faq" replace />} />
        <Route
          path="/admin/usuarios"
          element={
            <Suspense fallback={<AdminRouteFallback />}>
              <AdminCheckUser />
            </Suspense>
          }
        />
        <Route
          path="/admin/check-user"
          element={
            <Suspense fallback={<AdminRouteFallback />}>
              <AdminCheckUser />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <Erro404 />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
