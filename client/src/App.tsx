import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import EnviarArquivos from './container/enviar_arquivos'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnviarArquivos />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
