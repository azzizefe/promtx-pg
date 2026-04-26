import { useState, useEffect } from 'react';
import { ConnectedAccounts } from '../components/settings/ConnectedAccounts';
import { ApiKeyManager } from '../components/settings/ApiKeyManager';
import { ReferralShare } from '../components/settings/ReferralShare';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  useEffect(() => {
    fetch('/api/billing/subscription/status')
      .then(res => res.json())
      .then(data => {
        setSubStatus(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingSub(false));
  }, []);

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

  const renderSubCard = () => {
    if (loadingSub) return <div style={styles.card}>Loading subscription data...</div>;
    
    const plan = subStatus?.plan || 'starter';
    const monthlyCredits = subStatus?.monthlyCredits || 100;
    const creditsUsed = subStatus?.creditsUsedThisPeriod || 0;
    const remaining = Math.max(0, monthlyCredits - creditsUsed);
    const progress = Math.min(100, (creditsUsed / monthlyCredits) * 100);
    const renewDate = subStatus?.currentPeriodEnd 
      ? new Date(subStatus.currentPeriodEnd).toLocaleDateString() 
      : 'N/A';
    const isCancelled = subStatus?.cancelAtPeriodEnd;

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Subscription Plan</h2>
          <span style={styles.planBadge}>{plan.toUpperCase()}</span>
        </div>

        {isCancelled && (
          <div style={styles.warningBanner}>
            ⚠️ Your subscription will end on {renewDate}
          </div>
        )}

        <div style={styles.statRow}>
          <span>Next billing date:</span>
          <span style={styles.statValue}>{renewDate}</span>
        </div>

        <div style={styles.usageSection}>
          <div style={styles.usageHeader}>
            <span>Credits Used:</span>
            <span>{creditsUsed} / {monthlyCredits}</span>
          </div>
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          <small style={styles.remainingText}>{remaining} credits remaining</small>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            onClick={handleManageSubscription} 
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? 'Loading...' : 'Manage Subscription'}
          </button>
          
          <button 
            onClick={() => window.location.href = '/pricing'} 
            style={styles.secondaryButton}
          >
            Change Plan
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Settings</h1>
      
      {renderSubCard()}

      <ConnectedAccounts />
      <ApiKeyManager />
      <ReferralShare />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '50px auto',
    padding: '0 20px',
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '30px',
    color: '#fff',
    textAlign: 'center' as const,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    padding: '30px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    marginBottom: '40px',
    color: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
  },
  planBadge: {
    background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  warningBanner: {
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#fbbf24',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '0.95rem',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '25px',
    fontSize: '1rem',
    color: '#94a3b8',
  },
  statValue: {
    color: '#fff',
    fontWeight: '600',
  },
  usageSection: {
    marginBottom: '30px',
  },
  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '0.95rem',
    color: '#cbd5e1',
  },
  progressBarContainer: {
    height: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    background: '#4f46e5',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  remainingText: {
    color: '#94a3b8',
    display: 'block',
    textAlign: 'right',
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
  },
  primaryButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  secondaryButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'transparent',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  }
};
