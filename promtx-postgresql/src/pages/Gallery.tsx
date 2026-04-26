import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { 
  Folder, Heart, Image, Video, AudioLines, 
  FolderPlus, Search, SlidersHorizontal, Grid, 
  Lock, Globe, Trash2, Download 
} from 'lucide-react';

interface GalleryItem {
  id: string;
  type: 'image' | 'video' | 'prompt' | 'audio';
  prompt: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  likesCount: number;
  isFavorite: boolean;
  isPublic: boolean;
  createdAt: string;
  studioType?: string;
  modelId?: string;
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'public' ? 'public' : 'my';

  // State
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    loadGallery();
  }, [activeTab, activeFilter, searchQuery]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      let url = activeTab === 'public' ? '/gallery/public' : '/gallery/my';
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      
      if (activeFilter === 'favorite') params.append('isFavorite', 'true');
      else if (activeFilter !== 'all') params.append('studio', activeFilter);

      const res = await fetchApi(`${url}?${params.toString()}`);
      setItems(res.items || []);
    } catch (err: any) {
      toast.error('Galeri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await fetchApi('/gallery/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName })
      });
      toast.success('Klasör oluşturuldu');
      setNewFolderName('');
      setIsCreatingFolder(false);
      // Reload folders
    } catch (err) {
      toast.error('Klasör oluşturulamadı');
    }
  };

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%', 
      minHeight: '100svh', 
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      
      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '20px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setSearchParams({})}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'my' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'my' ? 'var(--text-h)' : 'var(--text)',
            fontWeight: activeTab === 'my' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          Galerim
        </button>
        <button 
          onClick={() => setSearchParams({ tab: 'public' })}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'public' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'public' ? 'var(--text-h)' : 'var(--text)',
            fontWeight: activeTab === 'public' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          Topluluk
        </button>
      </div>

      {/* Gallery Shell */}
      <div style={{ display: 'flex', gap: '32px', flex: 1 }}>
        
        {/* Left Sidebar (only for Galerim) */}
        {activeTab === 'my' && (
          <div style={{
            width: '260px',
            borderRight: '1px solid var(--border)',
            paddingRight: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            textAlign: 'left'
          }}>
            {/* Filters */}
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-h)', marginBottom: '12px' }}>Filtreler</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => setActiveFilter('all')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '6px', background: activeFilter === 'all' ? 'var(--accent-bg)' : 'transparent',
                    border: 'none', color: activeFilter === 'all' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', width: '100%', textAlign: 'left'
                  }}
                >
                  <Grid size={18} /> Tümü
                </button>
                <button 
                  onClick={() => setActiveFilter('favorite')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '6px', background: activeFilter === 'favorite' ? 'var(--accent-bg)' : 'transparent',
                    border: 'none', color: activeFilter === 'favorite' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', width: '100%', textAlign: 'left'
                  }}
                >
                  <Heart size={18} /> Favoriler
                </button>
                <button 
                  onClick={() => setActiveFilter('image')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '6px', background: activeFilter === 'image' ? 'var(--accent-bg)' : 'transparent',
                    border: 'none', color: activeFilter === 'image' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', width: '100%', textAlign: 'left'
                  }}
                >
                  <Image size={18} /> Görseller
                </button>
                <button 
                  onClick={() => setActiveFilter('video')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '6px', background: activeFilter === 'video' ? 'var(--accent-bg)' : 'transparent',
                    border: 'none', color: activeFilter === 'video' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', width: '100%', textAlign: 'left'
                  }}
                >
                  <Video size={18} /> Videolar
                </button>
              </div>
            </div>

            {/* Folders */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', color: 'var(--text-h)', margin: 0 }}>Klasörler</h3>
                <button 
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                >
                  <FolderPlus size={18} />
                </button>
              </div>
              
              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Klasör adı..."
                    style={{
                      flex: 1, padding: '6px', borderRadius: '4px', 
                      border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)'
                    }}
                  />
                  <button type="submit" style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Ekle
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {folders.map(folder => (
                  <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', color: 'var(--text)' }}>
                    <Folder size={18} /> <span>{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Feed */}
        <div style={{ flex: 1 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text)' }} size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Prompt veya model ara..."
              style={{
                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Items Grid */}
          {loading ? (
            <div style={{ padding: '40px', fontSize: '16px' }}>Yükleniyor...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text)', fontSize: '16px' }}>Gösterilecek öge yok.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px'
            }}>
              {items.map(item => (
                <div 
                  key={item.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    textAlign: 'left'
                  }}
                >
                  {/* Image/Video Thumbnail */}
                  <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--code-bg)', position: 'relative' }}>
                    {item.resultUrl ? (
                      <img 
                        src={item.resultUrl} 
                        alt={item.prompt} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text)' }}>
                        {item.type === 'video' ? <Video size={40} /> : <Image size={40} />}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', 
                      color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      {item.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                      <span>{item.type}</span>
                    </div>
                  </div>

                  {/* Info pane */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <p style={{
                      fontSize: '14px', margin: '0 0 10px 0', color: 'var(--text-h)',
                      overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>
                      {item.prompt}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text)' }}>{item.modelId || 'AI Model'}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: 'none', border: 'none', color: item.isFavorite ? '#ef4444' : 'var(--text)', cursor: 'pointer' }}>
                          <Heart size={16} fill={item.isFavorite ? '#ef4444' : 'none'} />
                        </button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
