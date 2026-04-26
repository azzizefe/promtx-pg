import React, { useState } from 'react';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'bug' | 'feature' | 'other'>('other');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.error('Dosya eklenemez, sadece mesaj yazabilirsiniz.');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const types = e.clipboardData.types;
    if (!types.includes('text/plain')) {
      e.preventDefault();
      toast.error('Sadece metin yapıştırabilirsiniz.');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 5000) {
      setMessage(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          debugContext: {
            studio: 'image',
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
          }
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Geri bildirim gönderilemedi.');
      }

      toast.success('Geri bildiriminiz iletildi. Teşekkür ederiz!');
      setMessage('');
      setType('other');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCountColor = message.length >= 4500 ? '#e6a23c' : '#909399';
  const charCountFinalColor = message.length === 5000 ? '#f56c6c' : charCountColor;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Geri Bildirim Gönder</h3>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={groupStyle}>
            <label style={labelStyle}>Tür</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as any)} 
              style={selectStyle}
              required
            >
              <option value="bug">Hata Bildir (Bug)</option>
              <option value="feature">Öneri / İstek (Feature)</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div style={groupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={labelStyle}>Mesajınız</label>
              <span style={{ fontSize: '12px', color: charCountFinalColor }}>
                {message.length}/5000
              </span>
            </div>
            <textarea
              value={message}
              onChange={handleMessageChange}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPaste={handlePaste}
              placeholder="Geri bildiriminizi buraya yazın... (Min 10 karakter)"
              style={textareaStyle}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={message.length < 10 || isSubmitting} 
            style={{
              ...submitButtonStyle,
              opacity: message.length < 10 || isSubmitting ? 0.5 : 1,
              cursor: message.length < 10 || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  width: '90%',
  maxWidth: '500px',
  padding: '20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  fontFamily: 'sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#909399',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
};

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#303133',
};

const selectStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #dcdfe6',
  fontSize: '14px',
};

const textareaStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #dcdfe6',
  fontSize: '14px',
  minHeight: '120px',
  resize: 'vertical',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: '#303133',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '16px',
  fontWeight: 500,
  transition: 'opacity 0.2s',
};
