import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter-tight';
import App from './App.jsx';
import './styles.css';

// Bez StrictMode: etykiety <Html> z @react-three/drei gubią treść przy podwójnym montowaniu w React 19.
createRoot(document.getElementById('root')).render(<App />);
