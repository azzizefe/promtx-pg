import { useState, useEffect } from 'react';

interface ProviderAccount {
  provider: string;
  providerEmail: string | null;
  providerName: string | null;
  createdAt: string;
}

export default function Settings() {
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkModal, setUnlinkModal] = useState<{ isOpen: boolean; provider: string | null }>({ isOpen: false, provider: null });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/auth/providers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Bağlı hesaplar yüklenemedi.');
      const data = await res.json();
      setProviders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = (provider: string) => {
    // Start linking flow
    window.location.href = `http://localhost:3001/api/auth/${provider}`;
  };

  const handleUnlink = async () => {
    if (!unlinkModal.provider) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/auth/link/${unlinkModal.provider}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bağlantı kaldırılamadı.');
      
      // Refresh providers
      await fetchProviders();
      setUnlinkModal({ isOpen: false, provider: null });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const isLinked = (provider: string) => {
    return providers.some(p => p.provider.toLowerCase() === provider.toLowerCase());
  };

  const getProviderEmail = (provider: string) => {
    const account = providers.find(p => p.provider.toLowerCase() === provider.toLowerCase());
    return account ? account.providerEmail : null;
  };

  return (
    <div className="min-h-screen bg-[#121214] text-zinc-100 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hesap Ayarları</h1>
        <p className="text-zinc-400 text-sm mb-8">Profilinizi, güvenliğinizi ve bağlı uygulamalarınızı yönetin.</p>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-lg text-red-400 text-sm mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Connected Accounts Section */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold">Bağlı Hesaplar</h2>
            <p className="text-zinc-400 text-xs mt-1">Promtx'e hızlı giriş yapmak için harici hesaplarınızı bağlayın.</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Yükleniyor...
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {/* Google */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="m31.517 8.71 5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24l7.223-5.556c1.776-5.623 7.017-9.777 13.22-9.777 3.059 0 5.842 1.154 7.961 3.039A.2.2 0 0 0 31.517 8.71z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-6.202 0-11.443-4.154-13.22-9.777l-7.223 5.556C7.955 39.611 15.433 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083A19.896 19.896 0 0 0 44 24c0 5.382-2.119 10.273-5.545 13.894l-6.19-5.238C34.382 30.849 36 27.612 36 24c0-1.341-.138-2.65-.389-3.917H24v-8h19.611z" fill="#1976D2"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold">Google Hesabı</p>
                    <p className="text-xs text-zinc-400">{isLinked('google') ? getProviderEmail('google') : 'Bağlı değil'}</p>
                  </div>
                </div>
                <button
                  onClick={() => isLinked('google') ? setUnlinkModal({ isOpen: true, provider: 'google' }) : handleLink('google')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    isLinked('google') 
                      ? 'border-zinc-700 text-zinc-400 hover:border-red-900 hover:text-red-400 bg-zinc-900/50' 
                      : 'border-indigo-500 text-indigo-400 hover:bg-indigo-600/10 bg-indigo-500/5'
                  }`}
                >
                  {isLinked('google') ? 'Bağlantıyı Kaldır' : 'Bağla'}
                </button>
              </div>

              {/* Apple */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-8 h-8 flex-shrink-0 text-white fill-current" viewBox="0 0 22 27" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.57 11.12c-.03-2.6 2.13-3.85 2.23-3.9-.95-1.39-2.43-1.58-2.96-1.6-.97-.11-2.34.57-2.83.57-.5 0-1.63-.56-2.42-.56-1.54 0-3.34 1.04-4.13 2.42-1.6 2.78-.4 6.9 1.13 9.11.75 1.08 1.64 2.28 2.8 2.23 1.12-.04 1.55-.72 2.91-.72 1.35 0 1.74.72 2.91.7.1.02 1.08-.1 1.83-1.2.13-.19 1.07-1.56 1.43-3.13-3.22-.98-2.87-3.95-2.9-3.95zm-2.86-7.52c1.08-1.3 1.05-2.77 1.05-2.85-.1 0-1.57.08-2.65 1.33-.79.92-1.05 2.25-1.05 2.25.1.02 1.58.2 2.65-.73z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold">Apple ID</p>
                    <p className="text-xs text-zinc-400">{isLinked('apple') ? getProviderEmail('apple') : 'Bağlı değil'}</p>
                  </div>
                </div>
                <button
                  onClick={() => isLinked('apple') ? setUnlinkModal({ isOpen: true, provider: 'apple' }) : handleLink('apple')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    isLinked('apple') 
                      ? 'border-zinc-700 text-zinc-400 hover:border-red-900 hover:text-red-400 bg-zinc-900/50' 
                      : 'border-indigo-500 text-indigo-400 hover:bg-indigo-600/10 bg-indigo-500/5'
                  }`}
                >
                  {isLinked('apple') ? 'Bağlantıyı Kaldır' : 'Bağla'}
                </button>
              </div>

              {/* Microsoft */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold">Microsoft Hesabı</p>
                    <p className="text-xs text-zinc-400">{isLinked('microsoft') ? getProviderEmail('microsoft') : 'Bağlı değil'}</p>
                  </div>
                </div>
                <button
                  onClick={() => isLinked('microsoft') ? setUnlinkModal({ isOpen: true, provider: 'microsoft' }) : handleLink('microsoft')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    isLinked('microsoft') 
                      ? 'border-zinc-700 text-zinc-400 hover:border-red-900 hover:text-red-400 bg-zinc-900/50' 
                      : 'border-indigo-500 text-indigo-400 hover:bg-indigo-600/10 bg-indigo-500/5'
                  }`}
                >
                  {isLinked('microsoft') ? 'Bağlantıyı Kaldır' : 'Bağla'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unlink Modal */}
        {unlinkModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <div className="bg-[#121214] border border-zinc-800 p-6 rounded-xl max-w-sm w-full text-center shadow-xl text-zinc-100">
              <h3 className="text-lg font-bold text-red-400 mb-2">Bağlantıyı Kaldır?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                <strong>{unlinkModal.provider}</strong> hesabınızla artık giriş yapamayacaksınız. Onaylıyor musunuz?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setUnlinkModal({ isOpen: false, provider: null })}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleUnlink}
                  className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white text-sm font-semibold rounded-lg"
                >
                  Onayla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
