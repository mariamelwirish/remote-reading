import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/client';
import { Modal } from '../../../components/ui/Modal';

const inp = { display: 'block', width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', marginTop: 4, fontSize: 14 };
const primaryBtn = { padding: '8px 18px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 };

function RoomForm({ initial, onSubmit, loading, error }) {
  const [roomNumber, setRoomNumber] = useState(initial?.room_number ?? '');
  const [capacity, setCapacity]     = useState(initial?.capacity ?? 1);

  function handleSubmit(e) {
    e.preventDefault();
    const body = {};
    if (roomNumber !== (initial?.room_number ?? '')) body.room_number = roomNumber;
    if (capacity   !== (initial?.capacity   ?? 1))  body.capacity = Number(capacity);
    // For add, always send both
    if (!initial) { body.room_number = roomNumber; body.capacity = Number(capacity); }
    onSubmit(body);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Room Number</label>
        <input
          type="text" value={roomNumber}
          onChange={e => setRoomNumber(e.target.value)}
          required placeholder="e.g. 2A"
          style={inp}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Capacity</label>
        <input
          type="number" value={capacity} min={1}
          onChange={e => setCapacity(e.target.value)}
          required style={inp}
        />
      </div>
      {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Room'}
        </button>
      </div>
    </form>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
      background: isActive ? '#dcfce7' : '#f3f4f6',
      color: isActive ? '#15803d' : '#9ca3af',
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function RoomsTab() {
  const [rooms, setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [modal, setModal]   = useState(null); // { type: 'add'|'edit'|'deactivate', room? }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRooms = useCallback(() => {
    setLoading(true);
    api.get('/rooms')
      .then(({ data }) => setRooms(data))
      .catch(() => setError('Failed to load rooms.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  function closeModal() { setModal(null); setFormError(''); }

  async function handleAdd(body) {
    setSaving(true); setFormError('');
    try {
      await api.post('/rooms', body);
      fetchRooms(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to create room.');
    } finally { setSaving(false); }
  }

  async function handleEdit(body) {
    setSaving(true); setFormError('');
    try {
      await api.patch(`/rooms/${modal.room.id}`, body);
      fetchRooms(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to update room.');
    } finally { setSaving(false); }
  }

  async function handleDeactivate() {
    setSaving(true); setFormError('');
    try {
      await api.patch(`/rooms/${modal.room.id}/deactivate`);
      fetchRooms(); closeModal();
    } catch (err) {
      // 409 includes a babies list — surface the names
      const data = err.response?.data;
      if (data?.babies?.length) {
        const names = data.babies.map(b => `${b.first_name} ${b.last_name}`).join(', ');
        setFormError(`${data.error} Active babies: ${names}.`);
      } else {
        setFormError(data?.error ?? 'Failed to deactivate room.');
      }
    } finally { setSaving(false); }
  }

  async function handleReactivate(room) {
    try {
      await api.patch(`/rooms/${room.id}/reactivate`);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to reactivate room.');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>All Rooms</h2>
        <button onClick={() => setModal({ type: 'add' })} style={primaryBtn}>+ Add Room</button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && rooms.length === 0 && <p style={{ color: '#6b7280' }}>No rooms yet.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            {['Room', 'Capacity', 'Occupied', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 12px', fontWeight: 600 }}>Room {room.room_number}</td>
              <td style={{ padding: '12px 12px', color: '#6b7280' }}>{room.capacity}</td>
              <td style={{ padding: '12px 12px', color: '#6b7280' }}>{room.occupied}</td>
              <td style={{ padding: '12px 12px' }}><StatusBadge isActive={room.is_active} /></td>
              <td style={{ padding: '12px 12px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setModal({ type: 'edit', room })}
                    style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 }}
                  >
                    Edit
                  </button>
                  {room.is_active ? (
                    <button
                      onClick={() => setModal({ type: 'deactivate', room })}
                      style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(room)}
                      style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #86efac', background: '#fff', color: '#15803d', cursor: 'pointer', fontSize: 12 }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal?.type === 'add' && (
        <Modal title="Add Room" onClose={closeModal}>
          <RoomForm onSubmit={handleAdd} loading={saving} error={formError} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={`Edit Room ${modal.room.room_number}`} onClose={closeModal}>
          <RoomForm initial={modal.room} onSubmit={handleEdit} loading={saving} error={formError} />
        </Modal>
      )}

      {modal?.type === 'deactivate' && (
        <Modal title="Deactivate Room" onClose={closeModal}>
          <p style={{ color: '#374151', marginTop: 0 }}>
            Deactivate <strong>Room {modal.room.room_number}</strong>? It must have no active babies first.
          </p>
          {formError && <p style={{ color: 'red', fontSize: 13 }}>{formError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={closeModal} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDeactivate} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#b91c1c', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
