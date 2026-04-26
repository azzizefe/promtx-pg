import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const ApiKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, we would fetch existing keys here
    // const loadKeys = async () => { ... }
    // loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchApi('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setGeneratedKey(data.apiKey);
      setKeys([...keys, { id: data.id, keyPrefix: data.apiKey.substring(0, 8) + '...', name: newKeyName, createdAt: new Date().toISOString(), lastUsedAt: null }]);
      setNewKeyName('');
      toast.success('API Key generated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', marginTop: '20px' }}>
      <h3>API Keys</h3>
      <p style={{ color: '#666' }}>Manage your developer API keys.</p>

      {generatedKey && (
        <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c8e6c9' }}>
          <strong>Save this key! It will not be shown again.</strong>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', gap: '10px' }}>
            <code style={{ background: '#fff', padding: '8px', borderRadius: '4px', flex: 1 }}>{generatedKey}</code>
            <button onClick={() => copyToClipboard(generatedKey)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Copy size={20} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key Name (e.g. Production Server)"
          required
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
        />
        <button type="submit" style={{ padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Generate New Key
        </button>
      </form>

      {keys.length > 0 && (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 0' }}>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last Used</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 0' }}>{k.name}</td>
                <td><code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>{k.keyPrefix}</code></td>
                <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
