import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

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

// Returns the minimum datetime-local string for "right now + 1 minute"
// so the datetime picker can't select the past.
function minDateTimeLocal() {
  const d = new Date(Date.now() + 60 * 1000);
  return d.toISOString().slice(0, 16);
}

const fmt = (val) => val
  ? new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  : '';

// Recordings the nurse can still act on (backend blocks only 'played')
const REVIEWABLE = ['pending_review', 'scheduled', 'rejected'];

function ReviewForm({ recording, onReviewed }) {
  const [mode, setMode] = useState(null); // null | 'schedule' | 'reject'
  const [scheduledTime, setScheduledTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isReschedule = recording.status === 'scheduled';
  const scheduleLabel = isReschedule ? 'Reschedule' : 'Schedule';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body = mode === 'schedule'
      ? { action: 'schedule', scheduled_time: new Date(scheduledTime).toISOString() }
      : { action: 'reject', note };

    try {
      await api.patch(`/recordings/${recording.id}/review`, body);
      onReviewed();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!mode) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setMode('schedule')}
          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          {scheduleLabel}
        </button>
        {/* Don't offer Reject on an already-rejected recording */}
        {recording.status !== 'rejected' && (
          <button
            onClick={() => setMode('reject')}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Reject
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      {mode === 'schedule' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Scheduled time</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            min={minDateTimeLocal()}
            onChange={e => setScheduledTime(e.target.value)}
            required
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%' }}
          />
        </div>
      )}
      {mode === 'reject' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Reason for rejection</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            required
            rows={2}
            placeholder="Explain why this recording is being rejected…"
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', resize: 'vertical' }}
          />
        </div>
      )}
      {error && <p style={{ color: 'red', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: mode === 'schedule' ? '#1d4ed8' : '#b91c1c', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          {loading ? 'Saving…' : mode === 'schedule' ? 'Confirm Schedule' : 'Confirm Reject'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(null); setError(''); }}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function RecordingCard({ recording, onReviewed }) {
  const [expanded, setExpanded] = useState(false);
  const isPending   = recording.status === 'pending_review';
  const isReviewable = REVIEWABLE.includes(recording.status);

  const scheduledTime  = recording.scheduled_time ? new Date(recording.scheduled_time) : null;
  const isDue = recording.status === 'scheduled' && scheduledTime && scheduledTime <= new Date();

  // Border/background reflects urgency
  const borderColor = isPending ? '#fde68a' : isDue ? '#86efac' : '#e5e7eb';
  const bgColor     = isPending ? '#fffbeb' : isDue ? '#f0fdf4' : '#fff';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor, borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{recording.title}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{recording.description}</div>
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
              Due to play
            </span>
          )}
        </div>
      </div>

      {/* Full timeline — nurse needs to see everything */}
      <div style={{ marginTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ color: '#9ca3af' }}>
          <span style={{ fontWeight: 500, color: '#6b7280' }}>Uploaded:</span> {fmt(recording.uploaded_at)}
          <span style={{ marginLeft: 8, color: '#d1d5db' }}>·</span>
          <span style={{ marginLeft: 8 }}>{recording.duration_seconds}s</span>
        </div>

        {recording.status === 'scheduled' && scheduledTime && (
          <div style={{ color: isDue ? '#15803d' : '#1d4ed8', fontWeight: 600 }}>
            Scheduled for: {fmt(scheduledTime)}
            {isDue && ' — should be playing now'}
          </div>
        )}

        {recording.reviewed_at && recording.status !== 'pending_review' && (
          <div style={{ color: '#9ca3af' }}>
            <span style={{ fontWeight: 500, color: '#6b7280' }}>
              {recording.status === 'scheduled' ? 'Scheduled on' :
               recording.status === 'rejected'  ? 'Rejected on'  :
               recording.status === 'played'    ? 'Played on'    : 'Reviewed on'}:
            </span>{' '}
            {fmt(recording.reviewed_at)}
          </div>
        )}
      </div>

      {recording.audio_url && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 13, background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? 'Hide audio ▲' : 'Listen ▼'}
          </button>
          {expanded && (
            <audio controls src={recording.audio_url} style={{ display: 'block', width: '100%', marginTop: 8 }} />
          )}
        </div>
      )}

      {isReviewable && <ReviewForm recording={recording} onReviewed={onReviewed} />}
    </div>
  );
}

export default function RecordingQueue() {
  const { roomId, babyId } = useParams();
  const navigate = useNavigate();

  const [baby, setBaby] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/babies/${babyId}`),
      api.get(`/babies/${babyId}/recordings`),
    ])
      .then(([babyRes, recRes]) => {
        setBaby(babyRes.data);
        setRecordings(recRes.data.recordings);
      })
      .catch(() => setError('Failed to load recordings.'))
      .finally(() => setLoading(false));
  }, [babyId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const needsReview = recordings.filter(r => r.status === 'pending_review');
  const decided     = recordings.filter(r => r.status === 'scheduled' || r.status === 'rejected');
  const history     = recordings.filter(r => r.status === 'played' || r.status === 'cancelled');

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        <button onClick={() => navigate('/nurse')} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0 }}>
          Rooms
        </button>
        {' › '}
        <button onClick={() => navigate(`/nurse/rooms/${roomId}`)} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0 }}>
          Room
        </button>
        {baby && ` › ${baby.first_name} ${baby.last_name}`}
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {baby && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem' }}>{baby.first_name} {baby.last_name}</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Room {baby.room_number} · {baby.gender} · Admitted {new Date(baby.admission_date).toLocaleDateString()}
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* Pending review — genuinely unactioned */}
          <h2 style={{ fontSize: '1rem', marginBottom: 12 }}>
            Needs Review
            {needsReview.length > 0 && (
              <span style={{ marginLeft: 8, background: '#fbbf24', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                {needsReview.length}
              </span>
            )}
          </h2>
          {needsReview.length === 0
            ? <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>No recordings waiting for review.</p>
            : needsReview.map(r => <RecordingCard key={r.id} recording={r} onReviewed={fetchData} />)
          }

          {/* Scheduled / Rejected — decision made, but changeable */}
          {decided.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginBottom: 12, marginTop: 32 }}>Scheduled / Rejected</h2>
              {decided.map(r => <RecordingCard key={r.id} recording={r} onReviewed={fetchData} />)}
            </>
          )}

          {/* Terminal states — no further action */}
          {history.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginBottom: 12, marginTop: 32 }}>History</h2>
              {history.map(r => <RecordingCard key={r.id} recording={r} onReviewed={fetchData} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}
