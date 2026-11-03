import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/cyrillic-400.css';
import '@fontsource/cormorant-garamond/cyrillic-400-italic.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/lora/cyrillic-400.css';
import '@fontsource/lora/latin-400.css';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Не удалось открыть зимний дом', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="error-screen paper"><h1>Дому нужна минутка</h1><p>Не удалось открыть эту страницу. Попробуй обновить её — сохранение останется в браузере.</p><button className="paper-button" onClick={() => window.location.reload()}>Попробовать снова</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
