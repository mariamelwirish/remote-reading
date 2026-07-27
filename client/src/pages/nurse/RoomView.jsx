import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Baby as BabyIcon } from 'lucide-react';
import api from '../../api/client';
import { theme } from '../../theme';
import { Badge, Spinner, EmptyState } from '../../components/ui';

const c = theme.color;

function RecordingBadges({ pendingCount, scheduledCount }) {
  if (pendingCount === 0 && scheduledCount === 0) {
    return <div style={{ marginTop: 10, fontSize: 13, color: c.textFaint }}>No messages waiting</div>;
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {pendingCount > 0 && <Badge tone="warn">{pendingCount} waiting for review</Badge>}
      {scheduledCount > 0 && <Badge tone="info">{scheduledCount} scheduled</Badge>}
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
        background: c.cardBg, border: `1px solid ${hasPending ? c.warn : c.border}`,
        borderRadius: theme.radius.lg, boxShadow: theme.shadow.sm, padding: '18px 18px',
        cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'box-shadow .15s, transform .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadow.md; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = theme.shadow.sm; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: c.accentSoft, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BabyIcon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: c.text }}>{baby.first_name} {baby.last_name}</div>
            <div style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>
              {baby.gender.charAt(0).toUpperCase() + baby.gender.slice(1)} · {ageDays} days old
            </div>
            {baby.record_number && <div style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>ID {baby.record_number}</div>}
          </div>
        </div>
        <ChevronRight size={18} color={c.textFaint} style={{ flexShrink: 0 }} />
      </div>
      <RecordingBadges pendingCount={baby.pending_review_count} scheduledCount={baby.scheduled_count} />
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
      .catch(() => setError('We couldn’t load the babies in this room.'))
      .finally(() => setLoading(false));
  }, [roomId]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 16px 40px' }}>
      <button
        onClick={() => navigate('/nurse')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0, marginBottom: 18, fontSize: 14, fontWeight: 600 }}
      >
        <ChevronLeft size={16} /> All rooms
      </button>

      <h1 style={{ marginTop: 0, fontSize: 22, fontWeight: 800, color: c.text, marginBottom: 22 }}>Babies in this room</h1>

      {error && <p style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <Spinner />
      ) : babies.length === 0 ? (
        <EmptyState icon={<BabyIcon size={34} color={c.textFaint} />} title="No babies in this room" hint="Babies assigned to this room will show up here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {babies.map(baby => (
            <BabyCard key={baby.id} baby={baby} onClick={() => navigate(`babies/${baby.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
