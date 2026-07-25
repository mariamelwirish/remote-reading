import { useState, useRef } from 'react';
import api from '../../api/client';

export default function UploadRecording({ baby, onClose, onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select an audio file.');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('baby_id', baby.id);
    formData.append('title', title.trim());
    formData.append('description', description.trim());

    setLoading(true);
    try {
      await api.post('/recordings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Overlay backdrop
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 32,
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>New Recording for {baby.first_name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="rec-title" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Title</label>
            <input
              id="rec-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Goodnight song"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="rec-desc" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Description</label>
            <textarea
              id="rec-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="A short description of what you recorded"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Audio File</label>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              onChange={e => setFile(e.target.files[0] ?? null)}
              style={{ width: '100%' }}
            />
            {file && (
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {error && <p style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
