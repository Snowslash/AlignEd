import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initialiseEstateTheme } from '@sangeev/estate-ui'
import './index.css'
import App from './App.tsx'

initialiseEstateTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
