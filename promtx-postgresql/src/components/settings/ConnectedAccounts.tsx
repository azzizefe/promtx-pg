import { useAuthStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

export const ConnectedAccounts = () => {
  const { linkedProviders, linkProvider, unlinkProvider } = useAuthStore();

  const handleLink = async (provider: 'google' | 'apple' | 'microsoft') => {
    try {
      // In a real flow, this redirects to OAuth endpoint
      // and returns to a callback that links the account.
      // For now, we mock the API call:
      await fetchApi(`/auth/link/${provider}`, { method: 'POST' });
      linkProvider(provider);
      toast.success(`${provider} account linked successfully!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to link ${provider}`);
    }
  };

  const handleUnlink = async (provider: 'google' | 'apple' | 'microsoft') => {
    try {
      await fetchApi(`/auth/link/${provider}`, { method: 'DELETE' });
      unlinkProvider(provider);
      toast.success(`${provider} account unlinked successfully!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to unlink ${provider}`);
    }
  };

  const providers: ('google' | 'apple' | 'microsoft')[] = ['google', 'apple', 'microsoft'];

  return (
    <div className="connected-accounts" style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
      <h3>Connected Accounts</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>Link your social accounts for easier login.</p>
      
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {providers.map(provider => {
          const isLinked = linkedProviders.includes(provider);
          return (
            <li key={provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{provider}</span>
              {isLinked ? (
                <button 
                  onClick={() => handleUnlink(provider)}
                  style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Unlink
                </button>
              ) : (
                <button 
                  onClick={() => handleLink(provider)}
                  style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Link
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
