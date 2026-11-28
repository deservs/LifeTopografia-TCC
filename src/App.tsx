import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import AppLayout from "./components/Layout/AppLayout";
import {
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/Layout/RouteGuards";
import { AuthProvider } from "./context/AuthContext";
import Home from "./container/Home/home";

const About = lazy(() => import("./container/About/about"));
const Cadastrar = lazy(() => import("./container/Auth/cadastrar"));
const DefinirSenha = lazy(() => import("./container/Auth/definirSenha"));
const Login = lazy(() => import("./container/Auth/login"));

const Pagamento = lazy(() => import("./components/Pop-Up/Pagamento/pagamento"));
const Services = lazy(() => import("./container/Services/services"));
const Profile = lazy(() => import("./container/Profile/profile"));
const Teste = lazy(() => import("./container/Enviar-arquivos/enviar_arquivos"));
const Chat = lazy(() => import("./container/Chat/chat"));
const FAQ = lazy(() => import("./container/FAQ/faq"));

const NoticeModal = lazy(
  () => import("./components/Pop-Up/NoticeModal/noticeModal"),
);
const AdminCheckUser = lazy(
  () => import("./container/AdminCheckUser/adminCheckUser"),
);

function AdminRouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "60dvh",
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
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route
              element={<AppLayout showTopbar={false} showFooter={false} />}
            >
              <Route path="/" element={<Home />} />
            </Route>

            <Route element={<AppLayout showTopbar={true} showFooter={false} />}>
              <Route element={<GuestRoute />}>
                <Route path="/cadastrar" element={<Cadastrar />} />
                <Route path="/login" element={<Login />} />
              </Route>
            </Route>

            <Route element={<AppLayout showTopbar={true} showFooter={true} />}>
              <Route path="/sobre" element={<About />} />
              <Route
                path="/sobre-nos"
                element={<Navigate to="/sobre" replace />}
              />
              <Route path="/about" element={<Navigate to="/sobre" replace />} />
              <Route path="/servicos" element={<Services />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/FAQ" element={<Navigate to="/faq" replace />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/perfil" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/pagamento" element={<Pagamento />} />
                <Route path="/definir-senha" element={<DefinirSenha />} />
              </Route>

              <Route element={<AdminRoute />}>
                <Route path="/teste" element={<Teste />} />
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
              </Route>
            </Route>

            <Route
              path="*"
              element={
                <NoticeModal
                  code="ERRO 404"
                  popupTitle="Saímos da rota."
                  message="A página que você procura não foi encontrada. Volte ao início para continuar navegando pela LifeTopografia."
                  buttonText="Voltar ao início"
                  buttonLink=""
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
