import { useState } from 'react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

export const Setup2FA = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const startSetup = async () => {
    try {
      const data = await fetchApi('/auth/setup-2fa', { method: 'POST' });
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
    } catch (err: any) {
      toast.error('Failed to start 2FA setup');
    }
  };

  const verifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setIsSetupComplete(true);
      toast.success('2FA successfully enabled!');
    } catch (err: any) {
      toast.error('Invalid token');
    }
  };

  if (isSetupComplete) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>2FA Enabled</h2>
        <p>Your account is now more secure.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif' }}>
      <h2>Set up Two-Factor Authentication</h2>
      {!qrCodeUrl ? (
        <button onClick={startSetup} style={{ padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Begin Setup
        </button>
      ) : (
        <div>
          <p>Scan this QR code with your authenticator app:</p>
          <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '200px', height: '200px', margin: '20px auto', display: 'block' }} />
          <p style={{ textAlign: 'center', fontFamily: 'monospace' }}>{secret}</p>
          
          <form onSubmit={verifySetup} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input 
              type="text" 
              value={token} 
              onChange={e => setToken(e.target.value)} 
              placeholder="Enter 6-digit code"
              required 
              maxLength={6}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Verify & Enable
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
