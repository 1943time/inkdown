import './styles/editor.scss'
import 'antd/dist/reset.css'
import 'react-photo-view/dist/react-photo-view.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import {ErrorBoundary, ErrorFallback} from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ErrorBoundary
    fallback={e => <ErrorFallback error={e}/>}
  >
    <App />
  </ErrorBoundary>
)
