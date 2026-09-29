import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './container/Home/home';
import Cadastrar from './container/Auth/cadastrar';
import Login from './container/Auth/login'; // 1. Importar o componente Login

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadastrar" element={<Cadastrar />} />
        
        {/* 2. Declarar a rota /login */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;