import { Link, BrowserRouter, Routes, Route } from 'react-router-dom'

import './App.css'

import Home from "./pages/Home/Home.jsx"
import SobreNos from "./pages/Sobre-nos/Sobre-nos.jsx"
import Contato from "./pages/Contato/Contato.jsx"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/Sobre-Nós' element={<SobreNos />} />
        <Route path='/Contato' element={<Contato />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
