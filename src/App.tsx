import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/themeContext';
import useLenis from './hooks/useLenis';
import { initSocket, disconnectSocket } from './services/socket';
import { useAuthStore } from './store/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import Home from './pages/Home';
import Pinboard from './pages/Pinboard';
import MemoryStack from './pages/MemoryStack';
import Games from './pages/Games';
import Recommendations from './pages/Recommendations';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import PairPartner from './pages/PairPartner';
import CompleteProfile from './pages/CompleteProfile';
import NotFound from './pages/NotFound';
import PhoneUpload from './pages/PhoneUpload';

/**
 * App Entry Router Configuration
 * Purpose:
 * - Bootstraps the application layout routing.
 * - Initializes Lenis scrolling and Socket.io clients on app bootstrap.
 */
const App: React.FC = () => {
  // Activate Lenis Smooth Scroll
  useLenis();

  // The socket server requires a login, so connect only while signed in and drop it on sign-out
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) return;
    initSocket();
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Authenticated/Dashboard Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="pinboard" element={<Pinboard />} />
            <Route path="memory-stack" element={<MemoryStack />} />
            <Route path="games" element={<Games />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="gallery" element={<Gallery />} />
          </Route>

          {/* Unauthenticated/Login Routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="complete-profile" element={<CompleteProfile />} />
            <Route path="pair-partner" element={<PairPartner />} />
          </Route>

          {/* Phone upload page (opened from the Gallery QR code, no dashboard chrome) */}
          <Route path="upload/:token" element={<PhoneUpload />} />

          {/* Wildcard 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
