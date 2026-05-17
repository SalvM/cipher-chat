import './App.css'

import { BrowserRouter, Routes, Route } from 'react-router';
import Home from './home';
import NotFound from './NotFound';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
