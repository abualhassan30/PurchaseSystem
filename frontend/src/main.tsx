import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import './i18n/config' // Initialize i18n synchronously before rendering

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

try {
  const root = ReactDOM.createRoot(rootElement)
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  console.error('App crashed at initialization:', error)
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; background: white; min-height: 100vh;">
      <h1 style="color: red;">Initialization Error</h1>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `
}
