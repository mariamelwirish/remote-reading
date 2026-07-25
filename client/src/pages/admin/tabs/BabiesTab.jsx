import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/client';
import { Modal } from '../../../components/ui/Modal';

const inp = { display: 'block', width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', marginTop: 4, fontSize: 14 };
const primaryBtn  = { padding: '8px 18px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const cancelBtn   = { padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 };
const dangerBtn   = { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#b91c1c', color: '#fff', fontWeight: 600, cursor: 'pointer' };

// Formats a DB date string (ISO or YYYY-MM-DD) to just the date part for <input type="date">
const toDateInput = (val) => (val ? val.slice(0, 10) : '');

function RoomSelect({ value, onChange, rooms, required }) {
  return (
    <select value={value} onChange={onChange} required={required} style={inp}>
      <option value="">Select a room…</option>
      {rooms.map(r => (
        <option key={r.id} value={r.id}>
          Room {r.room_number} — {r.occupied}/{r.capacity} occupied
        </option>
      ))}
    </select>
  );
}

// Shared form for Add and Edit. Edit omits admission_date (not patchable).
function BabyForm({ initial, activeRooms, onSubmit, loading, error }) {
  const isEdit = !!initial;
  const [f, setF] = useState({
    first_name:     initial?.first_name     ?? '',
    last_name:      initial?.last_name      ?? '',
    date_of_birth:  toDateInput(initial?.date_of_birth)  ?? '',
    gender:         initial?.gender         ?? 'male',
    room_id:        initial?.room_id        ?? '',
    admission_date: toDateInput(initial?.admission_date) ?? '',
  });

  const set = (key) => (e) => setF(prev => ({ ...prev, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) {
      // Only send fields that changed
      const body = {};
      if (f.first_name    !== initial.first_name)              body.first_name    = f.first_name;
      if (f.last_name     !== initial.last_name)               body.last_name     = f.last_name;
      if (f.date_of_birth !== toDateInput(initial.date_of_birth)) body.date_of_birth = f.date_of_birth;
      if (f.gender        !== initial.gender)                  body.gender        = f.gender;
      if (f.room_id       !== initial.room_id)                 body.room_id       = f.room_id;
      onSubmit(body);
    } else {
      onSubmit(f);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>First Name</label>
          <input type="text" value={f.first_name} onChange={set('first_name')} required style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Last Name</label>
          <input type="text" value={f.last_name} onChange={set('last_name')} required style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Date of Birth</label>
          <input type="date" value={f.date_of_birth} onChange={set('date_of_birth')} required style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Gender</label>
          <select value={f.gender} onChange={set('gender')} style={inp}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Room</label>
          <RoomSelect value={f.room_id} onChange={set('room_id')} rooms={activeRooms} required />
        </div>
        {!isEdit && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Admission Date</label>
            <input type="date" value={f.admission_date} onChange={set('admission_date')} required style={inp} />
          </div>
        )}
      </div>
      {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Baby'}
        </button>
      </div>
    </form>
  );
}

function RoomPickerModal({ title, onSubmit, onClose, loading, error }) {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    api.get('/rooms/available').then(({ data }) => setAvailableRooms(data)).catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(roomId);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Select Room</label>
          <RoomSelect value={roomId} onChange={e => setRoomId(e.target.value)} rooms={availableRooms} required />
          {availableRooms.length === 0 && (
            <p style={{ fontSize: 13, color: '#b45309', marginTop: 6 }}>No rooms with available capacity.</p>
          )}
        </div>
        {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const FILTERS = ['all', 'active', 'discharged'];

function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
      background: active ? '#dcfce7' : '#f3f4f6',
      color: active ? '#15803d' : '#9ca3af',
    }}>
      {active ? 'Active' : 'Discharged'}
    </span>
  );
}

export default function BabiesTab() {
  const [babies, setBabies]     = useState([]);
  const [filter, setFilter]     = useState('active');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null); // { type, baby? }
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  // Active rooms for the Add/Edit baby form
  const [activeRooms, setActiveRooms] = useState([]);

  const fetchBabies = useCallback(() => {
    setLoading(true);
    const params = filter !== 'all' ? { status: filter } : {};
    api.get('/babies', { params })
      .then(({ data }) => setBabies(data))
      .catch(() => setError('Failed to load babies.'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchBabies(); }, [fetchBabies]);

  // Fetch active rooms when the add or edit modal opens
  useEffect(() => {
    if (modal?.type === 'add' || modal?.type === 'edit') {
      api.get('/rooms', { params: { active: 'true' } })
        .then(({ data }) => setActiveRooms(data))
        .catch(() => {});
    }
  }, [modal?.type]);

  function closeModal() { setModal(null); setFormError(''); }

  async function handleAdd(body) {
    setSaving(true); setFormError('');
    try {
      await api.post('/babies', body);
      fetchBabies(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to add baby.');
    } finally { setSaving(false); }
  }

  async function handleEdit(body) {
    if (Object.keys(body).length === 0) { closeModal(); return; }
    setSaving(true); setFormError('');
    try {
      await api.patch(`/babies/${modal.baby.id}`, body);
      fetchBabies(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to update baby.');
    } finally { setSaving(false); }
  }

  async function handleDischarge() {
    setSaving(true); setFormError('');
    try {
      await api.patch(`/babies/${modal.baby.id}/discharge`);
      fetchBabies(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to discharge baby.');
    } finally { setSaving(false); }
  }

  async function handleReadmit(roomId) {
    setSaving(true); setFormError('');
    try {
      await api.patch(`/babies/${modal.baby.id}/readmit`, { room_id: roomId });
      fetchBabies(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to readmit baby.');
    } finally { setSaving(false); }
  }

  async function handleReassign(roomId) {
    setSaving(true); setFormError('');
    try {
      await api.patch(`/babies/${modal.baby.id}/reassign-room`, { room_id: roomId });
      fetchBabies(); closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to reassign room.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: 999, border: '1px solid',
                borderColor: filter === f ? '#1d4ed8' : '#d1d5db',
                background: filter === f ? '#eff6ff' : '#fff',
                color: filter === f ? '#1d4ed8' : '#6b7280',
                cursor: 'pointer', fontSize: 13, fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setModal({ type: 'add' })} style={primaryBtn}>+ Add Baby</button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && babies.length === 0 && <p style={{ color: '#6b7280' }}>No babies found.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            {['Name', 'DOB', 'Gender', 'Room', 'Status', 'Admitted', 'Actions'].map(h => (
              <th key={h} style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {babies.map(baby => (
            <tr key={baby.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 10px', fontWeight: 600 }}>{baby.first_name} {baby.last_name}</td>
              <td style={{ padding: '12px 10px', color: '#6b7280' }}>{toDateInput(baby.date_of_birth)}</td>
              <td style={{ padding: '12px 10px', color: '#6b7280', textTransform: 'capitalize' }}>{baby.gender}</td>
              <td style={{ padding: '12px 10px', color: '#6b7280' }}>
                {baby.room_number ? `Room ${baby.room_number}` : '—'}
              </td>
              <td style={{ padding: '12px 10px' }}><StatusBadge status={baby.status} /></td>
              <td style={{ padding: '12px 10px', color: '#6b7280' }}>{toDateInput(baby.admission_date)}</td>
              <td style={{ padding: '12px 10px' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {baby.status === 'active' && (
                    <>
                      <button onClick={() => setModal({ type: 'edit', baby })}
                        style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                        Edit
                      </button>
                      <button onClick={() => setModal({ type: 'reassign', baby })}
                        style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#fff', color: '#1d4ed8', cursor: 'pointer', fontSize: 12 }}>
                        Move Room
                      </button>
                      <button onClick={() => setModal({ type: 'discharge', baby })}
                        style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>
                        Discharge
                      </button>
                    </>
                  )}
                  {baby.status === 'discharged' && (
                    <button onClick={() => setModal({ type: 'readmit', baby })}
                      style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #86efac', background: '#fff', color: '#15803d', cursor: 'pointer', fontSize: 12 }}>
                      Readmit
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add modal */}
      {modal?.type === 'add' && (
        <Modal title="Add Baby" onClose={closeModal}>
          <BabyForm activeRooms={activeRooms} onSubmit={handleAdd} loading={saving} error={formError} />
        </Modal>
      )}

      {/* Edit modal */}
      {modal?.type === 'edit' && (
        <Modal title={`Edit ${modal.baby.first_name} ${modal.baby.last_name}`} onClose={closeModal}>
          <BabyForm initial={modal.baby} activeRooms={activeRooms} onSubmit={handleEdit} loading={saving} error={formError} />
        </Modal>
      )}

      {/* Discharge confirmation */}
      {modal?.type === 'discharge' && (
        <Modal title="Discharge Baby" onClose={closeModal}>
          <p style={{ marginTop: 0, color: '#374151' }}>
            Discharge <strong>{modal.baby.first_name} {modal.baby.last_name}</strong>?
            This will cancel all pending and scheduled recordings.
          </p>
          {formError && <p style={{ color: 'red', fontSize: 13 }}>{formError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={closeModal} style={cancelBtn}>Cancel</button>
            <button onClick={handleDischarge} disabled={saving} style={dangerBtn}>
              {saving ? 'Discharging…' : 'Discharge'}
            </button>
          </div>
        </Modal>
      )}

      {/* Readmit — needs room picker */}
      {modal?.type === 'readmit' && (
        <RoomPickerModal
          title={`Readmit ${modal.baby.first_name} ${modal.baby.last_name}`}
          onSubmit={handleReadmit}
          onClose={closeModal}
          loading={saving}
          error={formError}
        />
      )}

      {/* Reassign room */}
      {modal?.type === 'reassign' && (
        <RoomPickerModal
          title={`Move ${modal.baby.first_name} ${modal.baby.last_name} to a New Room`}
          onSubmit={handleReassign}
          onClose={closeModal}
          loading={saving}
          error={formError}
        />
      )}
    </div>
  );
}
