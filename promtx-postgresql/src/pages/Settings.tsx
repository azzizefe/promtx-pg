import { useState } from 'react';
import { ConnectedAccounts } from '../components/settings/ConnectedAccounts';
import { ApiKeyManager } from '../components/settings/ApiKeyManager';
import { ReferralShare } from '../components/settings/ReferralShare';

export default function Settings() {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'mock-user-id' }),
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to get portal URL');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
      <h1>Settings</h1>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Subscription</h2>
        <button 
          onClick={handleManageSubscription} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6772e5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Manage Subscription'}
        </button>
      </div>

      <ConnectedAccounts />
      <ApiKeyManager />
      <ReferralShare />
    </div>
  );
}
