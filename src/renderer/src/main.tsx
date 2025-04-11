import './styles/index.scss'
import '@ant-design/v5-patch-for-react-19'
import '@lobehub/ui'
import 'katex/dist/katex.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
)
