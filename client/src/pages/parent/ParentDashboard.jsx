import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/client';
import UploadRecording from './UploadRecording';

// Shows date + hour:minute, e.g. "Jul 1, 2026, 2:35 PM"
const fmt = (val) => val
  ? new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  : '';

const STATUS_LABEL = {
  pending_review: 'Pending Review',
  scheduled: 'Scheduled',
  played: 'Played',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  pending_review: '#b45309',
  scheduled: '#1d4ed8',
  played: '#15803d',
  rejected: '#b91c1c',
  cancelled: '#6b7280',
};

function RecordingCard({ recording }) {
  const [expanded, setExpanded] = useState(false);

  const scheduledTime = recording.scheduled_time ? new Date(recording.scheduled_time) : null;
  const isDue = recording.status === 'scheduled' && scheduledTime && scheduledTime <= new Date();

  return (
    <div style={{
      border: `1px solid ${isDue ? '#86efac' : '#e5e7eb'}`,
      background: isDue ? '#f0fdf4' : '#fff',
      borderRadius: 8,
      padding: '16px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{recording.title}</div>
          <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{recording.description}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 12 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: STATUS_COLOR[recording.status],
            background: STATUS_COLOR[recording.status] + '18',
            padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[recording.status]}
          </span>
          {isDue && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 999 }}>
              Playing now
            </span>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
        {recording.duration_seconds}s &nbsp;·&nbsp; Uploaded {fmt(recording.uploaded_at)}
        {recording.status === 'scheduled' && recording.scheduled_time && (
          <span style={{ color: '#1d4ed8' }}> · Scheduled for {fmt(recording.scheduled_time)}</span>
        )}
        {recording.status === 'rejected' && recording.reviewed_at && (
          <span> · Reviewed {fmt(recording.reviewed_at)}</span>
        )}
        {recording.status === 'played' && recording.reviewed_at && (
          <span style={{ color: '#15803d' }}> · Played {fmt(recording.reviewed_at)}</span>
        )}
      </div>

      {recording.audio_url && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 13, background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? 'Hide audio ▲' : 'Play audio ▼'}
          </button>
          {expanded && (
            <audio controls src={recording.audio_url} style={{ display: 'block', width: '100%', marginTop: 8 }} />
          )}
        </div>
      )}
    </div>
  );
}

function RecordingsList({ babyId }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecordings = useCallback(() => {
    api.get(`/babies/${babyId}/recordings`)
      .then(({ data }) => { setRecordings(data.recordings); setLoading(false); })
      .catch(() => { setError('Failed to load recordings.'); setLoading(false); });
  }, [babyId]);

  useEffect(() => {
    setLoading(true);
    fetchRecordings();
    // Poll every 30 s so "scheduled → played" transitions appear without a manual refresh
    const interval = setInterval(fetchRecordings, 30000);
    return () => clearInterval(interval);
  }, [fetchRecordings]);

  if (loading) return <p style={{ color: '#6b7280' }}>Loading recordings…</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  const inProgress = recordings.filter(r => ['pending_review', 'scheduled'].includes(r.status));
  const history    = recordings.filter(r => ['played', 'rejected', 'cancelled'].includes(r.status));

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>In Progress</h3>
      {inProgress.length === 0
        ? <p style={{ color: '#9ca3af', fontSize: 14 }}>No recordings in progress.</p>
        : inProgress.map(r => <RecordingCard key={r.id} recording={r} />)
      }

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>History</h3>
      {history.length === 0
        ? <p style={{ color: '#9ca3af', fontSize: 14 }}>No recordings yet.</p>
        : history.map(r => <RecordingCard key={r.id} recording={r} />)
      }
    </div>
  );
}

export default function ParentDashboard() {
  const { user, logout } = useAuth();

  const [babies, setBabies] = useState([]);
  const [selectedBabyId, setSelectedBabyId] = useState(null);
  const [loadingBabies, setLoadingBabies] = useState(true);
  const [babiesError, setBabiesError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    api.get('/babies')
      .then(({ data }) => {
        setBabies(data);
        if (data.length > 0) setSelectedBabyId(data[0].id);
      })
      .catch(() => setBabiesError('Failed to load your baby information.'))
      .finally(() => setLoadingBabies(false));
  }, []);

  const selectedBaby = babies.find(b => b.id === selectedBabyId);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Remote Reading for Newborns</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Welcome, {user.first_name}
          </p>
        </div>
        <button onClick={logout} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Baby selector (only shown if linked to more than one) */}
      {loadingBabies && <p>Loading…</p>}
      {babiesError && <p style={{ color: 'red' }}>{babiesError}</p>}

      {babies.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="baby-select" style={{ fontWeight: 600, marginRight: 8 }}>Baby:</label>
          <select
            id="baby-select"
            value={selectedBabyId ?? ''}
            onChange={e => setSelectedBabyId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            {babies.map(b => (
              <option key={b.id} value={b.id}>
                {b.first_name} {b.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {babies.length === 0 && !loadingBabies && (
        <p style={{ color: '#6b7280' }}>You are not yet linked to a baby. Please contact the nursing staff.</p>
      )}

      {selectedBaby && (
        <>
          {/* Baby info strip */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ fontWeight: 600 }}>{selectedBaby.first_name} {selectedBaby.last_name}</span>
              {selectedBaby.room_number && (
                <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 12 }}>Room {selectedBaby.room_number}</span>
              )}
              <span style={{
                marginLeft: 12,
                fontSize: 12,
                fontWeight: 600,
                color: selectedBaby.status === 'active' ? '#15803d' : '#b91c1c',
              }}>
                {selectedBaby.status === 'active' ? 'Active' : 'Discharged'}
              </span>
            </div>

            {selectedBaby.status === 'active' && (
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  background: '#1d4ed8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                + New Recording
              </button>
            )}
          </div>

          {/* Recordings */}
          <RecordingsList key={selectedBabyId} babyId={selectedBabyId} />
        </>
      )}

      {/* Upload modal */}
      {showUpload && selectedBaby && (
        <UploadRecording
          baby={selectedBaby}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            // Re-mount RecordingsList to refetch
            setSelectedBabyId(id => id);
          }}
        />
      )}
    </div>
  );
}
