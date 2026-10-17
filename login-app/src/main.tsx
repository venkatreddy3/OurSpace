import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import LoginPage from './LoginPage';
import { MOCK_CODE, mockServices } from './mockServices';
import type { SessionUser } from './types';

// Standalone harness: mock services stand in for Google, email and the backend.
const App: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(null);

  if (user) {
    return (
      <div className="bg-background text-on-background font-sans min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="font-serif text-3xl">Signed in as @{user.username}</p>
        <p className="text-on-surface-variant text-sm">{user.name} · {user.email}</p>
        <p className="text-xs text-on-surface-variant">(In the main app this redirects to the dashboard.)</p>
        <button className="btn-outline-blue text-sm" onClick={() => setUser(null)}>Back to login</button>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-sans min-h-screen flex items-center justify-center">
      <LoginPage
        services={mockServices}
        onComplete={setUser}
        onBypass={() => alert('Bypass clicked')}
        devHint={`the mock code is ${MOCK_CODE}`}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
