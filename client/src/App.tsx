import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import Home from './container/Home/home';
import Cadastrar from './container/Auth/cadastrar';
import Login from './container/Auth/login'; // 1. Importar o componente Login
import Teste from './container/Enviar-arquivos/enviar_arquivos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadastrar" element={<Cadastrar />} />
        
        {/* 2. Declarar a rota /login */}
        <Route path="/login" element={<Login />} />
        <Route path="/teste" element={<Teste />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
