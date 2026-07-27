import { useState } from 'react';
import { UploadCloud, Music } from 'lucide-react';
import api from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { theme } from '../../theme';
import { Button, Field } from '../../components/ui';

const c = theme.color;

export default function UploadRecording({ baby, onClose, onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!file) { setError('Please choose an audio file to send.'); return; }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('baby_id', baby.id);
    formData.append('title', title.trim());
    formData.append('description', description.trim());

    setLoading(true);
    try {
      await api.post('/recordings', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error ?? 'We couldn’t send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`New message for ${baby.first_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Goodnight song" style={{ marginBottom: 14 }} />
        <Field as="textarea" label="Description" value={description} onChange={e => setDescription(e.target.value)} required rows={3} placeholder="A short note about your message" style={{ marginBottom: 16 }} />

        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Audio</span>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 18,
          padding: '16px', borderRadius: theme.radius.md, border: `1.5px dashed ${c.borderStrong}`,
          background: c.subtleBg, cursor: 'pointer',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: c.accentSoft, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {file ? <Music size={20} /> : <UploadCloud size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            {file ? (
              <>
                <div style={{ fontWeight: 700, color: c.text, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: c.textMuted }}>{(file.size / 1024 / 1024).toFixed(2)} MB · tap to change</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, color: c.text, fontSize: 14 }}>Choose an audio file</div>
                <div style={{ fontSize: 12, color: c.textMuted }}>A voice recording from your device</div>
              </>
            )}
          </div>
          <input type="file" accept="audio/*" onChange={e => setFile(e.target.files[0] ?? null)} style={{ display: 'none' }} />
        </label>

        {error && (
          <p style={{ color: c.danger, background: c.dangerSoft, padding: '8px 12px', borderRadius: theme.radius.sm, fontSize: 13, margin: '0 0 14px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading} icon={<UploadCloud size={16} />}>{loading ? 'Sending…' : 'Send message'}</Button>
        </div>
      </form>
    </Modal>
  );
}
