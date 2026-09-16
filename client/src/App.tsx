import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router'
/* import EnviarArquivos from './container/Enviar-arquivos/enviar_arquivos'
 */import Home from './container/Home/home'
import Auth from './container/Auth/cadastrar.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App