import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Importar primero los estilos de Video.js para que nuestro tema los sobrescriba
import 'video.js/dist/video-js.css'
import './index.css'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LanguageProvider>
)
