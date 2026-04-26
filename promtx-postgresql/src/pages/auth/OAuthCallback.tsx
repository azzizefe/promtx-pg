import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function OAuthCallback() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(`${provider} giriş hatası: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Eksik yetkilendirme kodu veya state.');
      return;
    }

    // Backend'e code + state gönder
    fetch(`http://localhost:3001/api/auth/${provider}/callback?code=${code}&state=${state}`)
      .then((res) => {
        if (!res.ok) throw new Error('Token doğrulaması başarısız oldu.');
        return res.json();
      })
      .then((result) => {
        localStorage.setItem('token', result.token);
        setStatus('success');
        navigate('/');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Bilinmeyen bir hata oluştu.');
      });
  }, [provider, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121214] text-zinc-100 font-sans p-4">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <svg className="animate-spin h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="text-lg font-semibold tracking-wide">Oturum açılıyor, lütfen bekleyin...</h2>
          <span className="text-sm text-zinc-500 uppercase font-bold tracking-widest">{provider}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl text-center shadow-xl">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-red-400 mb-2">Giriş Başarısız</h2>
          <p className="text-zinc-400 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all active:scale-[0.98]"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      )}
    </div>
  );
}
