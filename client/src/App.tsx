import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router'
/* import EnviarArquivos from './container/Enviar-arquivos/enviar_arquivos'
 */import Home from './container/Home/home'
import Teste from './container/Enviar-arquivos/enviar_arquivos'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teste" element={<Teste />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App