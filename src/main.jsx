import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// THIS LINE BELOW IS THE KEY - IT LOADS THE STYLES
import './index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)