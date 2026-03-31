import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { IkaProvider } from './context/IkaContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IkaProvider>
          <App />
        </IkaProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
