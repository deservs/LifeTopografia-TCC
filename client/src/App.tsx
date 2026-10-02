import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import Home from './container/Home/home';
import Cadastrar from './container/Auth/cadastrar';
import Login from './container/Auth/login';
import Services from './container/Services/services';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cadastrar" element={<Cadastrar />} />
                <Route path="/login" element={<Login />} />
                <Route path="/servicos" element={<Services />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
