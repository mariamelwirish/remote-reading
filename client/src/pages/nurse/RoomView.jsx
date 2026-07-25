import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

function RecordingBadges({ pendingCount, scheduledCount }) {
  if (pendingCount === 0 && scheduledCount === 0) {
    return (
      <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>No pending recordings</div>
    );
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {pendingCount > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#b45309' }}>
          {pendingCount} pending review
        </span>
      )}
      {scheduledCount > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8' }}>
          {scheduledCount} scheduled
        </span>
      )}
    </div>
  );
}

function BabyCard({ baby, onClick }) {
  const dob = new Date(baby.date_of_birth);
  const ageDays = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24));
  const hasPending = baby.pending_review_count > 0;

  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        border: `1px solid ${hasPending ? '#fde68a' : '#e5e7eb'}`,
        borderRadius: 10,
        padding: '18px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#93c5fd'}
      onMouseLeave={e => e.currentTarget.style.borderColor = hasPending ? '#fde68a' : '#e5e7eb'}
    >
      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
        {baby.first_name} {baby.last_name}
      </div>
      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
        {baby.gender.charAt(0).toUpperCase() + baby.gender.slice(1)} · {ageDays} days old
      </div>
      <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
        Admitted {new Date(baby.admission_date).toLocaleDateString()}
      </div>
      <RecordingBadges
        pendingCount={baby.pending_review_count}
        scheduledCount={baby.scheduled_count}
      />
    </button>
  );
}

export default function RoomView() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [babies, setBabies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/rooms/${roomId}/babies`)
      .then(({ data }) => setBabies(data))
      .catch(() => setError('Failed to load babies for this room.'))
      .finally(() => setLoading(false));
  }, [roomId]);

  // Derive room number from the first baby's context, or just show the ID fallback
  const roomLabel = babies[0] ? '' : '';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <button
        onClick={() => navigate('/nurse')}
        style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0, marginBottom: 20, fontSize: 14 }}
      >
        ← All Rooms
      </button>

      <h1 style={{ marginTop: 0, fontSize: '1.4rem', marginBottom: 24 }}>
        Babies in Room
      </h1>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && babies.length === 0 && (
        <p style={{ color: '#6b7280' }}>No active babies in this room.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {babies.map(baby => (
          <BabyCard
            key={baby.id}
            baby={baby}
            onClick={() => navigate(`babies/${baby.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
