import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History as HistoryIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import History from './components/History';
import SplashScreen from './components/SplashScreen';

const Navigation = () => {
  const location = useLocation();
  if (location.pathname === '/scanner') return null;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <LayoutDashboard size={24} />
        <span>Início</span>
      </Link>
      <Link to="/history" className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}>
        <HistoryIcon size={24} />
        <span>Histórico</span>
      </Link>
    </nav>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/history" element={<History />} />
      </Routes>
      <Navigation />
    </Router>
  );
}

export default App;
