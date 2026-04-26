import { useState } from 'react';
import { OAuthButtons } from './auth/OAuthButtons';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = activeTab === 'login' 
        ? { email, password } 
        : { email, password, displayName };

      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');

      localStorage.setItem('token', data.token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#121214] border border-zinc-800 p-8 rounded-2xl shadow-2xl text-zinc-100">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {activeTab === 'login' ? 'Promtx\'e Hoş Geldiniz' : 'Yeni Hesap Oluşturun'}
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Kreatif evreninizi genişletin.
          </p>
        </div>

        <div className="flex border-b border-zinc-800 mb-6">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === 'login' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === 'register' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* OAuth Buttons */}
        <OAuthButtons 
          mode={activeTab} 
          onError={(err) => setError(err)} 
          onSuccess={() => onClose()} 
        />

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-red-400 text-xs mb-4">
            {error}
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Ad Soyad</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">E-posta Adresi</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Yükleniyor...' : activeTab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}
