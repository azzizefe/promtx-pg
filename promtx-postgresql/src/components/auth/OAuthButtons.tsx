export const OAuthButtons = () => {
  const handleOAuthLogin = (provider: 'google' | 'apple' | 'microsoft') => {
    // Redirect to our backend auth endpoints
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="oauth-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button 
        type="button" 
        onClick={() => handleOAuthLogin('google')}
        style={{ padding: '10px', background: '#db4437', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Continue with Google
      </button>
      <button 
        type="button" 
        onClick={() => handleOAuthLogin('apple')}
        style={{ padding: '10px', background: '#000000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Continue with Apple
      </button>
      <button 
        type="button" 
        onClick={() => handleOAuthLogin('microsoft')}
        style={{ padding: '10px', background: '#00a4ef', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Continue with Microsoft
      </button>
    </div>
  );
};
