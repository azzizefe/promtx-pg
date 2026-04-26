import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

export const OAuthCallback = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(`${provider} login failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Missing authorization code or state');
      return;
    }

    const authenticate = async () => {
      try {
        const res = await fetchApi(`/auth/${provider}/callback?code=${code}&state=${state}`);
        const data = res.data || res;
        login(data.user, data.token);
        setStatus('success');
        toast.success(`Successfully authenticated with ${provider}`);
        navigate('/');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Authentication failed');
      }
    };

    authenticate();
  }, [provider, searchParams, login, navigate]);

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      {status === 'loading' && <h2>Authenticating with {provider}...</h2>}
      {status === 'error' && (
        <>
          <h2 style={{ color: 'red' }}>Authentication Error</h2>
          <p>{errorMsg}</p>
          <button onClick={() => navigate('/login')} style={{ padding: '10px', marginTop: '10px' }}>
            Back to Login
          </button>
        </>
      )}
      {status === 'success' && <h2>Redirecting...</h2>}
    </div>
  );
};
