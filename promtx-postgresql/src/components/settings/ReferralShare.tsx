import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Share2, Copy } from 'lucide-react';

export const ReferralShare: React.FC = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const data = await fetchApi('/auth/referral-code');
        setReferralCode(data.code);
      } catch (err) {
        // Silently fail or handle error
      }
    };
    fetchReferral();
  }, []);

  const shareLink = referralCode ? `https://promtx.os/register?ref=${referralCode}` : '';

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Referral link copied!');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', marginTop: '20px', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <Share2 size={24} color="#3b82f6" />
        <h3 style={{ margin: 0 }}>Invite Friends, Get Free Credits</h3>
      </div>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Share your referral link with friends. When they sign up, you both get <strong>500 free credits</strong>!
      </p>

      {referralCode ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            readOnly 
            value={shareLink} 
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, background: '#fff', color: '#333' }}
          />
          <button onClick={copyToClipboard} style={{ padding: '10px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Copy size={16} /> Copy Link
          </button>
        </div>
      ) : (
        <p>Loading your referral code...</p>
      )}
    </div>
  );
};
