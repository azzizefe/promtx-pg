import React from 'react';

interface LowCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCredits: number;
}

export default function LowCreditsDialog({ isOpen, onClose, remainingCredits }: LowCreditsDialogProps) {
  if (!isOpen) return null;

  const handleBuyCredits = async () => {
    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000 }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start topup checkout');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose}>×</button>
        
        <div style={styles.iconContainer}>
          <span style={styles.icon}>⚡</span>
        </div>
        
        <h2 style={styles.title}>Low on Credits!</h2>
        <p style={styles.subtitle}>
          You only have <strong>{remainingCredits}</strong> credits left. You need more credits to generate prompts.
        </p>

        <div style={styles.buttonGroup}>
          <button onClick={handleBuyCredits} style={styles.primaryButton}>
            Buy Extra Credits
          </button>
          
          <button onClick={() => window.location.href = '/pricing'} style={styles.secondaryButton}>
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '450px',
    width: '90%',
    textAlign: 'center',
    position: 'relative',
    color: '#fff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer',
  },
  iconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(245, 158, 11, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  icon: {
    fontSize: '30px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '10px',
    background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#cbd5e1',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  primaryButton: {
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(192, 132, 252, 0.3)',
  },
  secondaryButton: {
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'transparent',
    color: '#fff',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
  }
};
