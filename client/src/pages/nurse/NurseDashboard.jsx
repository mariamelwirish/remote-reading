import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { theme } from '../../theme';
import { Badge, Spinner, EmptyState, PageHeader } from '../../components/ui';

const c = theme.color;

function RoomCard({ room, onClick }) {
  const isFull = room.occupied >= room.capacity;
  const isEmpty = room.occupied === 0;
  const tone = isFull ? 'warn' : isEmpty ? 'neutral' : 'success';
  const label = isFull ? 'Full' : isEmpty ? 'Empty' : 'Has space';

  return (
    <button
      onClick={onClick}
      style={{
        background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.sm, padding: '20px 18px', cursor: 'pointer', textAlign: 'left',
        width: '100%', transition: 'box-shadow .15s, transform .15s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadow.md; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = theme.shadow.sm; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: c.accentSoft, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DoorOpen size={20} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.text }}>Room {room.room_number}</div>
        </div>
        <ChevronRight size={18} color={c.textFaint} />
      </div>
      <div style={{ color: c.textMuted, fontSize: 14 }}>
        {room.occupied} / {room.capacity} {room.capacity === 1 ? 'baby' : 'babies'}
      </div>
      <Badge tone={tone}>{label}</Badge>
    </button>
  );
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/rooms', { params: { active: 'true' } })
      .then(({ data }) => setRooms(data))
      .catch(() => setError('We couldn’t load the rooms. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 16px 40px' }}>
      <PageHeader title="NICU Rooms" subtitle="Choose a room to see its babies and their messages" />

      {error && <p style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <Spinner label="Loading rooms…" />
      ) : rooms.length === 0 ? (
        <EmptyState icon={<DoorOpen size={34} color={c.textFaint} />} title="No active rooms" hint="Rooms will appear here once they’re set up." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} onClick={() => navigate(`rooms/${room.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
