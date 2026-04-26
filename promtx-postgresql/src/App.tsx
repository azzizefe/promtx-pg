import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationManager } from './components/NotificationManager';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Setup2FA } from './pages/auth/Setup2FA';

// Lazy loaded main pages
const Home = React.lazy(() => import('./pages/Home'));
const Wizard = React.lazy(() => import('./pages/Wizard'));
const Logs = React.lazy(() => import('./pages/Logs'));
const DevTools = React.lazy(() => import('./pages/DevTools'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const SubscriptionSuccess = React.lazy(() => import('./pages/SubscriptionSuccess'));
const SubscriptionCancel = React.lazy(() => import('./pages/SubscriptionCancel'));
const Help = React.lazy(() => import('./pages/Help'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Gallery = React.lazy(() => import('./pages/Gallery'));

// Simple loading fallback
const PageLoader = () => <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

// Global Layout to show basic navigation
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'sans-serif' }}>
    <header style={{ padding: '15px 20px', background: '#242424', color: 'white', display: 'flex', gap: '15px', alignItems: 'center' }}>
      <h2 style={{ margin: 0, marginRight: 'auto' }}>Promtx</h2>
      <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Studio</Link>
      <Link to="/gallery" style={{ color: 'white', textDecoration: 'none' }}>Gallery</Link>
      <Link to="/pricing" style={{ color: 'white', textDecoration: 'none' }}>Pricing</Link>
      <Link to="/settings" style={{ color: 'white', textDecoration: 'none' }}>Settings</Link>
    </header>
    <main style={{ flex: 1 }}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </main>
    <NotificationManager />
    <Toaster position="top-right" richColors />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/:provider/callback" element={<OAuthCallback />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/wizard" element={<Layout><Wizard /></Layout>} />
          <Route path="/logs" element={<Layout><Logs /></Layout>} />
          <Route path="/dev" element={<Layout><DevTools /></Layout>} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
          <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
          <Route path="/checkout/subscription/success" element={<Layout><SubscriptionSuccess /></Layout>} />
          <Route path="/checkout/subscription/cancel" element={<Layout><SubscriptionCancel /></Layout>} />
          <Route path="/help" element={<Layout><Help /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/gallery" element={<Layout><Gallery /></Layout>} />
          <Route path="/setup-2fa" element={<Layout><Setup2FA /></Layout>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
