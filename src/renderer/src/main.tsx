import '@ant-design/v5-patch-for-react-19'
import 'react-photo-view/dist/react-photo-view.css'
import 'katex/dist/katex.min.css'
import './utils/i18n'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
)
