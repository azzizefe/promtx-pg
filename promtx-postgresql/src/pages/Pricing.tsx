import { useState, useEffect } from 'react';

type SubscriptionPlan = 'starter' | 'creator' | 'studio_pro';

const TIERS = [
  {
    name: 'STARTER',
    plan: 'starter' as SubscriptionPlan,
    price: { monthly: 0, yearly: 0 },
    credits: 100,
    features: ['100 monthly credits', 'Standard response speed', 'Basic features access'],
    stripePriceId: { monthly: null, yearly: null },
  },
  {
    name: 'CREATOR',
    plan: 'creator' as SubscriptionPlan,
    price: { monthly: 29, yearly: 290 },
    credits: 5000,
    features: ['5000 monthly credits', 'Priority response speed', 'Advanced features access', 'Carry over up to 2000 credits'],
    stripePriceId: {
      monthly: 'price_creator_monthly',
      yearly: 'price_creator_yearly',
    },
  },
  {
    name: 'STUDIO PRO',
    plan: 'studio_pro' as SubscriptionPlan,
    price: { monthly: 69, yearly: 690 },
    credits: 15000,
    features: ['15000 monthly credits', 'Max response speed', 'All features access', 'Carry over up to 5000 credits', 'Dedicated support'],
    stripePriceId: {
      monthly: 'price_studio_pro_monthly',
      yearly: 'price_studio_pro_yearly',
    },
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('starter');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/billing/subscription/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.plan) {
          setCurrentPlan(data.plan as SubscriptionPlan);
        }
      })
      .catch(err => console.error('Failed to fetch subscription status', err));
  }, []);

  const handlePlanAction = async (tier: typeof TIERS[0]) => {
    if (tier.plan === currentPlan) return;
    
    const planHierarchy = { starter: 0, creator: 1, studio_pro: 2 };
    const currentLevel = planHierarchy[currentPlan];
    const newLevel = planHierarchy[tier.plan];

    if (newLevel < currentLevel) {
      const confirmDowngrade = window.confirm(
        `Are you sure you want to downgrade to ${tier.name}? Changes will take effect at the end of your billing cycle.`
      );
      if (!confirmDowngrade) return;

      setLoading(true);
      try {
        const priceId = isYearly ? tier.stripePriceId.yearly : tier.stripePriceId.monthly;
        const res = await fetch('/api/billing/subscription/change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: tier.plan, priceId }),
        });

        const data = await res.json();
        if (data.success) {
          alert(`Successfully scheduled downgrade to ${tier.name}`);
          setCurrentPlan(tier.plan);
        } else {
          alert(`Failed to downgrade: ${data.error}`);
        }
      } catch (error) {
        console.error(error);
        alert('An error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (tier.plan === 'starter') {
        window.location.href = '/auth';
        return;
      }

      const priceId = isYearly ? tier.stripePriceId.yearly : tier.stripePriceId.monthly;
      
      const res = await fetch('/api/billing/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout session');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Choose Your Plan</h1>
        <p style={styles.subtitle}>Unlock the full potential of Promtx with our premium features.</p>
        
        <div style={styles.toggleContainer}>
          <span style={{ ...styles.toggleLabel, opacity: !isYearly ? 1 : 0.5 }}>Monthly</span>
          <button 
            onClick={() => setIsYearly(!isYearly)} 
            style={styles.toggleButton}
          >
            <div style={{ 
              ...styles.toggleCircle, 
              transform: isYearly ? 'translateX(24px)' : 'translateX(0px)' 
            }} />
          </button>
          <span style={{ ...styles.toggleLabel, opacity: isYearly ? 1 : 0.5 }}>
            Yearly <span style={styles.discountBadge}>17% Off</span>
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        {TIERS.map((tier) => {
          const isCurrent = tier.plan === currentPlan;
          const price = isYearly ? tier.price.yearly : tier.price.monthly;
          const period = isYearly ? '/ year' : '/ month';

          return (
            <div 
              key={tier.name} 
              style={{ 
                ...styles.card, 
                ...(isCurrent ? styles.activeCard : {}) 
              }}
            >
              {isCurrent && <div style={styles.currentBadge}>Current Plan</div>}
              <h2 style={styles.tierName}>{tier.name}</h2>
              <div style={styles.priceContainer}>
                <span style={styles.priceSymbol}>$</span>
                <span style={styles.priceAmount}>{price}</span>
                <span style={styles.pricePeriod}>{period}</span>
              </div>
              <p style={styles.creditsText}>{tier.credits.toLocaleString()} Credits / month</p>
              
              <ul style={styles.featuresList}>
                {tier.features.map((feature, index) => (
                  <li key={index} style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span> {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handlePlanAction(tier)}
                disabled={loading || isCurrent}
                style={{ 
                  ...styles.actionButton, 
                  ...(isCurrent ? styles.disabledButton : {}),
                  ...(tier.plan === 'studio_pro' ? styles.proButton : {})
                }}
              >
                {isCurrent ? 'Current Plan' : (tier.plan === 'starter' ? 'Get Started' : 'Upgrade')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '60px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Inter', sans-serif",
    color: '#fff',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '50px',
  },
  title: {
    fontSize: '3rem',
    fontWeight: '800',
    marginBottom: '15px',
    background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#94a3b8',
    maxWidth: '600px',
    margin: '0 auto 30px',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '8px 16px',
    borderRadius: '30px',
    width: 'fit-content',
    margin: '0 auto',
    backdropFilter: 'blur(10px)',
  },
  toggleLabel: {
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'opacity 0.2s',
  },
  toggleButton: {
    width: '50px',
    height: '26px',
    borderRadius: '15px',
    background: '#4f46e5',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
  },
  toggleCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s ease-in-out',
  },
  discountBadge: {
    background: '#22c55e',
    color: '#fff',
    fontSize: '0.75rem',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginTop: '30px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    padding: '40px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s, border-color 0.3s',
  },
  activeCard: {
    borderColor: '#818cf8',
    boxShadow: '0 0 30px rgba(129, 140, 248, 0.2)',
    transform: 'scale(1.02)',
  },
  currentBadge: {
    position: 'absolute',
    top: '-15px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#818cf8',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: '600',
    padding: '6px 16px',
    borderRadius: '20px',
    boxShadow: '0 4px 10px rgba(129, 140, 248, 0.3)',
  },
  tierName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '20px',
    textAlign: 'center',
    letterSpacing: '1px',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  priceSymbol: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#94a3b8',
  },
  priceAmount: {
    fontSize: '3.5rem',
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginLeft: '5px',
  },
  creditsText: {
    textAlign: 'center',
    color: '#818cf8',
    fontWeight: '600',
    marginBottom: '30px',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 40px 0',
    flexGrow: 1,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
    fontSize: '0.95rem',
    color: '#cbd5e1',
  },
  checkIcon: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  actionButton: {
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.2s',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  disabledButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  proButton: {
    background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
    boxShadow: '0 4px 15px rgba(192, 132, 252, 0.3)',
  }
};
