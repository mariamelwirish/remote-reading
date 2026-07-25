import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/client';

function RoomCard({ room, onClick }) {
  const isFull = room.occupied >= room.capacity;
  const isEmpty = room.occupied === 0;

  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        border: `2px solid ${isFull ? '#fca5a5' : isEmpty ? '#e5e7eb' : '#86efac'}`,
        borderRadius: 10,
        padding: '20px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Room {room.room_number}</div>
      <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
        {room.occupied} / {room.capacity} {room.capacity === 1 ? 'baby' : 'babies'}
      </div>
      <div style={{
        marginTop: 10,
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 999,
        background: isFull ? '#fee2e2' : isEmpty ? '#f3f4f6' : '#dcfce7',
        color: isFull ? '#b91c1c' : isEmpty ? '#9ca3af' : '#15803d',
      }}>
        {isFull ? 'Full' : isEmpty ? 'Empty' : 'Has space'}
      </div>
    </button>
  );
}

export default function NurseDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/rooms', { params: { active: 'true' } })
      .then(({ data }) => setRooms(data))
      .catch(() => setError('Failed to load rooms.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>NICU Rooms</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Welcome, {user.first_name}</p>
        </div>
        <button onClick={logout} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading rooms…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && rooms.length === 0 && (
        <p style={{ color: '#6b7280' }}>No active rooms found.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={() => navigate(`rooms/${room.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
