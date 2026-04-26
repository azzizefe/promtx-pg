import React from 'react';

export default function SubscriptionSuccess() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>🎉</span>
        </div>
        <h1 style={styles.title}>Subscription Successful!</h1>
        <p style={styles.subtitle}>
          Thank you for upgrading your plan. Your account has been successfully updated.
        </p>
        
        <button 
          onClick={() => window.location.href = '/'} 
          style={styles.button}
        >
          Go to Studio
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '100px 20px',
    minHeight: 'calc(100vh - 70px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    padding: '50px 40px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
    color: '#fff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 30px',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  icon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '15px',
    background: 'linear-gradient(90deg, #4ade80 0%, #2dd4bf 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#cbd5e1',
    lineHeight: '1.6',
    marginBottom: '40px',
  },
  button: {
    padding: '14px 30px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(192, 132, 252, 0.3)',
  }
};
