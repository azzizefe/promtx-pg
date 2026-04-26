import { useState } from 'react';

interface OAuthButtonsProps {
  mode: 'login' | 'register' | 'link';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface OAuthButtonProps {
  provider: string;
  label: string;
  icon: React.ReactNode;
  colors: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function OAuthButton({ provider, label, icon, colors, onClick, isLoading, disabled }: OAuthButtonProps) {
  // @ts-ignore (provider may be used for tracking or internal logic)
  const _ = provider;
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${colors} ${
        isLoading || disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
      }`}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon
      )}
      <span>{label}</span>
    </button>
  );
}

export function OAuthButtons({ mode, onSuccess, onError }: OAuthButtonsProps) {
  // @ts-ignore
  const _s = onSuccess;
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = (provider: string) => {
    setLoadingProvider(provider);
    try {
      // Direct user to backend OAuth Init
      window.location.href = `http://localhost:3001/api/auth/${provider}`;
    } catch (error: any) {
      setLoadingProvider(null);
      if (onError) onError(error.message);
    }
  };

  return (
    <div className="space-y-3">
      <OAuthButton
        provider="google"
        label={mode === 'link' ? 'Google Hesabı Bağla' : 'Google ile Devam Et'}
        isLoading={loadingProvider === 'google'}
        disabled={loadingProvider !== null && loadingProvider !== 'google'}
        onClick={() => handleOAuth('google')}
        icon={
          <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="m31.517 8.71 5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24l7.223-5.556c1.776-5.623 7.017-9.777 13.22-9.777 3.059 0 5.842 1.154 7.961 3.039A.2.2 0 0 0 31.517 8.71z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-6.202 0-11.443-4.154-13.22-9.777l-7.223 5.556C7.955 39.611 15.433 44 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083A19.896 19.896 0 0 0 44 24c0 5.382-2.119 10.273-5.545 13.894l-6.19-5.238C34.382 30.849 36 27.612 36 24c0-1.341-.138-2.65-.389-3.917H24v-8h19.611z" fill="#1976D2"/>
          </svg>
        }
        colors="bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300"
      />
      <OAuthButton
        provider="apple"
        label={mode === 'link' ? 'Apple Hesabı Bağla' : 'Apple ile Devam Et'}
        isLoading={loadingProvider === 'apple'}
        disabled={loadingProvider !== null && loadingProvider !== 'apple'}
        onClick={() => handleOAuth('apple')}
        icon={
          <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 22 27" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.57 11.12c-.03-2.6 2.13-3.85 2.23-3.9-.95-1.39-2.43-1.58-2.96-1.6-.97-.11-2.34.57-2.83.57-.5 0-1.63-.56-2.42-.56-1.54 0-3.34 1.04-4.13 2.42-1.6 2.78-.4 6.9 1.13 9.11.75 1.08 1.64 2.28 2.8 2.23 1.12-.04 1.55-.72 2.91-.72 1.35 0 1.74.72 2.91.7.1.02 1.08-.1 1.83-1.2.13-.19 1.07-1.56 1.43-3.13-3.22-.98-2.87-3.95-2.9-3.95zm-2.86-7.52c1.08-1.3 1.05-2.77 1.05-2.85-.1 0-1.57.08-2.65 1.33-.79.92-1.05 2.25-1.05 2.25.1.02 1.58.2 2.65-.73z"/>
          </svg>
        }
        colors="bg-black hover:bg-zinc-900 text-white border border-zinc-800"
      />
      <OAuthButton
        provider="microsoft"
        label={mode === 'link' ? 'Microsoft Hesabı Bağla' : 'Microsoft ile Devam Et'}
        isLoading={loadingProvider === 'microsoft'}
        disabled={loadingProvider !== null && loadingProvider !== 'microsoft'}
        onClick={() => handleOAuth('microsoft')}
        icon={
          <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
        }
        colors="bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white"
      />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#121214] px-4 text-zinc-500 tracking-widest">veya</span>
        </div>
      </div>
    </div>
  );
}
