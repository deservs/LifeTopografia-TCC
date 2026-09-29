import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './container/Home/home';
import Cadastrar from './container/Auth/cadastrar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota da Página Inicial */}
        <Route path="/" element={<Home />} />

        {/* Rota de Cadastro (Casando com o Link to="/cadastrar" da Sidebar) */}
        <Route path="/cadastrar" element={<Cadastrar />} />
        
        {/* Alias opcional: se alguém acessar /auth, também carrega o Cadastrar */}
        <Route path="/auth" element={<Cadastrar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;