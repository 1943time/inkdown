import './styles/editor.scss'
import 'antd/dist/reset.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import {ErrorBoundary, ErrorFallback} from './components/ErrorBoundary'
import React from 'react'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ErrorBoundary
    fallback={e => <ErrorFallback error={e}/>}
  >
    <App />
  </ErrorBoundary>
)
