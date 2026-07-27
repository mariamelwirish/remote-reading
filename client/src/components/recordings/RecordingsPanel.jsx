import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, XCircle, Play, Square, ChevronDown, ChevronUp, AlertTriangle, ScrollText } from 'lucide-react';
import api from '../../api/client';
import { theme, statusTone } from '../../theme';
import { Button, Badge, Field, Spinner, StatusDot } from '../ui';

const c = theme.color;

// Turn the backend's terse status-history notes into calm, plain language.
function friendlyNote(note) {
  if (!note) return null;
  const n = note.toLowerCase();
  if (n.includes('offline') || n.includes('lost connection') || n.includes('went offline'))
    return 'The speaker lost connection while playing. Please try again once it’s reconnected.';
  if (n.includes('fetch_failed'))
    return 'The speaker couldn’t download this message. Please try again.';
  if (n.includes('play_failed') || n.includes('reported failure'))
    return 'This message couldn’t play on the speaker. Please try again.';
  if (n.includes('no confirmation'))
    return 'We didn’t get confirmation the speaker played this. Please try again.';
  if (n.includes('stopped manually'))
    return 'Playback was stopped, so this is back for review.';
  return note; // e.g. a nurse's own rejection reason — show as written
}

// Friendly label for each status transition in the activity log.
const HISTORY_LABEL = {
  pending_review: 'Returned for review',
  scheduled: 'Scheduled',
  played: 'Played',
  rejected: 'Declined',
  cancelled: 'Cancelled',
};

const STATUS_LABEL = {
  pending_review: 'Waiting for review',
  scheduled: 'Scheduled',
  played: 'Played',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

// Minimum for datetime-local: "now + 1 min" in LOCAL time.
function minDateTimeLocal() {
  const d = new Date(Date.now() + 60 * 1000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
const fmt = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

const REVIEWABLE = ['pending_review', 'scheduled', 'rejected'];
const PLAYABLE = ['pending_review', 'scheduled'];

// Friendly speaker-status line, shown before anyone tries to play.
function SpeakerStatus({ state, roomNumber }) {
  if (state === 'online') return <StatusDot color={c.online} label="Speaker connected — ready to play" />;
  if (state === 'offline') return <StatusDot color={c.offline} label={`The speaker${roomNumber ? ` in Room ${roomNumber}` : ''} isn’t connected right now`} />;
  return <StatusDot color={c.textFaint} label="No speaker is assigned to this baby yet" />;
}

function Actions({ recording, deviceState, onChanged }) {
  const [mode, setMode] = useState(null); // null | 'schedule' | 'reject'
  const [scheduledTime, setScheduledTime] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isReschedule = recording.status === 'scheduled';
  const canPlay = PLAYABLE.includes(recording.status);
  // 'played' means "in flight" until the device confirms completion (a
  // playback_log row). Only offer Stop while it's genuinely still playing —
  // once confirmed done, it's a finished recording, not something to stop.
  const isPlaying = recording.status === 'played' && !recording.confirmed_played;

  async function call(fn) {
    setError(''); setBusy(true);
    try { await fn(); onChanged(); }
    catch (err) { setError(err.response?.data?.error ?? 'That didn’t go through. Please try again.'); }
    finally { setBusy(false); }
  }

  const play = () => call(() => api.post(`/recordings/${recording.id}/play`));
  const stop = () => call(() => api.post(`/recordings/${recording.id}/stop`));

  async function submitReview(e) {
    e.preventDefault();
    const body = mode === 'schedule'
      ? { action: 'schedule', scheduled_time: new Date(scheduledTime).toISOString() }
      : { action: 'reject', note };
    await call(() => api.patch(`/recordings/${recording.id}/review`, body));
    setMode(null);
  }

  // Translate the backend's offline error into calm language.
  const friendlyError = /offline|not connected|reconnect/i.test(error)
    ? 'The speaker for this baby isn’t connected right now, so it can’t play. You can schedule it for later instead.'
    : error;

  if (mode) {
    return (
      <form onSubmit={submitReview} style={{ marginTop: 14, padding: 16, background: c.subtleBg, borderRadius: theme.radius.md, border: `1px solid ${c.border}` }}>
        {mode === 'schedule' ? (
          <Field label="When should this play?" type="datetime-local" value={scheduledTime} min={minDateTimeLocal()} onChange={e => setScheduledTime(e.target.value)} required />
        ) : (
          <Field as="textarea" label="Reason for declining" value={note} onChange={e => setNote(e.target.value)} required rows={2} placeholder="Let the parent know why, kindly…" />
        )}
        {error && <p style={{ color: c.danger, fontSize: 13, margin: '10px 0 0' }}>{friendlyError}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button size="sm" type="submit" disabled={busy} variant={mode === 'reject' ? 'danger' : 'primary'}>
            {busy ? 'Saving…' : mode === 'schedule' ? 'Confirm schedule' : 'Confirm decline'}
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => { setMode(null); setError(''); }}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canPlay && (
          <Button size="sm" icon={<Play size={15} />} disabled={busy || deviceState !== 'online'} onClick={play}>
            Play now
          </Button>
        )}
        {isPlaying && (
          <Button size="sm" variant="danger" icon={<Square size={14} />} disabled={busy} onClick={stop}>Stop</Button>
        )}
        {REVIEWABLE.includes(recording.status) && (
          <Button size="sm" variant="ghost" icon={<CalendarClock size={15} />} onClick={() => setMode('schedule')}>
            {isReschedule ? 'Reschedule' : 'Schedule'}
          </Button>
        )}
        {REVIEWABLE.includes(recording.status) && recording.status !== 'rejected' && (
          <Button size="sm" variant="ghost" icon={<XCircle size={15} />} style={{ color: c.danger, borderColor: c.dangerSoft }} onClick={() => setMode('reject')}>Decline</Button>
        )}
      </div>
      {canPlay && deviceState !== 'online' && (
        <p style={{ fontSize: 12, color: c.textMuted, margin: '8px 0 0' }}>
          {deviceState === 'offline' ? 'Play now is unavailable — the speaker isn’t connected. You can still schedule it.' : 'Play now is unavailable — no speaker is assigned to this baby yet.'}
        </p>
      )}
      {error && <p style={{ color: c.danger, fontSize: 13, margin: '8px 0 0' }}>{friendlyError}</p>}
    </div>
  );
}

// Expandable activity log for one recording — the plain-language "what happened".
function HistoryLog({ recordingId }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      api.get(`/recordings/${recordingId}/history`)
        .then(({ data }) => setRows(data.history))
        .catch(() => setError('Couldn’t load the activity log.'));
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer', padding: 0 }}>
        <ScrollText size={14} /> Activity log {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {error && <p style={{ color: c.danger, fontSize: 13, margin: 0 }}>{error}</p>}
          {!rows && !error && <Spinner label="Loading…" />}
          {rows && rows.length === 0 && <p style={{ color: c.textMuted, fontSize: 13, margin: 0 }}>No activity yet.</p>}
          {rows && rows.length > 0 && (
            <div style={{ border: `1px solid ${c.border}`, borderRadius: theme.radius.md, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: c.subtleBg }}>
                      {['#', 'Action', 'When', 'By', 'Details'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((h, i) => {
                      const isUpload = !h.from_status && h.to_status === 'pending_review';
                      const label = isUpload ? 'Uploaded' : (HISTORY_LABEL[h.to_status] ?? h.to_status);
                      const who = h.first_name ? `${h.first_name} ${h.last_name}` : 'System';
                      const note = friendlyNote(h.note);
                      const td = { padding: '9px 12px', fontSize: 13, verticalAlign: 'top', borderTop: `1px solid ${c.border}` };
                      return (
                        <tr key={h.id}>
                          <td style={{ ...td, color: c.textFaint, fontVariantNumeric: 'tabular-nums' }}>{rows.length - i}</td>
                          <td style={td}><Badge tone={statusTone[h.to_status] ?? 'neutral'}>{label}</Badge></td>
                          <td style={{ ...td, color: c.textMuted, whiteSpace: 'nowrap' }}>{fmt(h.changed_at)}</td>
                          <td style={{ ...td, color: c.textMuted, whiteSpace: 'nowrap' }}>{who}</td>
                          <td style={{ ...td, color: c.textMuted, minWidth: 180 }}>{note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecordingCard({ recording, deviceState, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = recording.status === 'pending_review';
  const isActivelyPlaying = recording.status === 'played' && !recording.confirmed_played;
  const scheduledTime = recording.scheduled_time ? new Date(recording.scheduled_time) : null;
  const isDue = recording.status === 'scheduled' && scheduledTime && scheduledTime <= new Date();
  const borderColor = isPending ? c.warn : (isDue || isActivelyPlaying) ? c.success : c.border;

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: c.cardBg, borderRadius: theme.radius.lg, boxShadow: theme.shadow.sm, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: c.text }}>{recording.title}</div>
          <div style={{ fontSize: 14, color: c.textMuted, marginTop: 2 }}>{recording.description}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Badge tone={statusTone[recording.status] ?? 'neutral'}>{isActivelyPlaying ? 'Playing…' : STATUS_LABEL[recording.status]}</Badge>
          {isActivelyPlaying && <Badge tone="success" icon={<Play size={11} />}>On the speaker now</Badge>}
          {isDue && <Badge tone="success" icon={<Play size={11} />}>Playing now</Badge>}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: c.textMuted }}>
        Uploaded {fmt(recording.uploaded_at)} · {recording.duration_seconds}s long
        {recording.status === 'scheduled' && scheduledTime && (
          <span style={{ color: isDue ? c.success : c.info, fontWeight: 700 }}> · Scheduled for {fmt(scheduledTime)}</span>
        )}
      </div>

      {/* Problem banner — surfaces WHY a message came back for review (device
          failure, lost connection, timeout, etc.) in plain language. */}
      {isPending && recording.latest_note && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: c.warnSoft, color: c.warn, padding: '10px 12px', borderRadius: theme.radius.md, marginTop: 12, fontSize: 13 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{friendlyNote(recording.latest_note)}</span>
        </div>
      )}

      {recording.audio_url && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setExpanded(e => !e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0 }}>
            {expanded ? <>Hide audio <ChevronUp size={14} /></> : <>Listen <ChevronDown size={14} /></>}
          </button>
          {expanded && <audio controls src={recording.audio_url} style={{ display: 'block', width: '100%', marginTop: 8 }} />}
        </div>
      )}

      <Actions recording={recording} deviceState={deviceState} onChanged={onChanged} />

      <HistoryLog recordingId={recording.id} />
    </div>
  );
}

function SectionTitle({ children, count, tone }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 800, color: c.text, marginBottom: 12, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}{count > 0 && <Badge tone={tone}>{count}</Badge>}
    </h2>
  );
}

// Shared by the nurse and admin recording views. Fetches the baby, its
// recordings, and its speaker's live status; renders review + play + stop.
export default function RecordingsPanel({ babyId, showHeader = true }) {
  const [baby, setBaby] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [deviceState, setDeviceState] = useState('none'); // 'online' | 'offline' | 'none'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(() => {
    Promise.all([
      api.get(`/babies/${babyId}`),
      api.get(`/babies/${babyId}/recordings`),
      api.get('/devices').catch(() => ({ data: [] })), // devices is admin/nurse only; tolerate failure
    ])
      .then(([babyRes, recRes, devRes]) => {
        setBaby(babyRes.data);
        setRecordings(recRes.data.recordings);
        const dev = (devRes.data || []).find(d => d.baby_id === babyId && d.is_active);
        setDeviceState(!dev ? 'none' : dev.is_online ? 'online' : 'offline');
      })
      .catch(() => setError('We couldn’t load these messages.'))
      .finally(() => setLoading(false));
  }, [babyId]);

  useEffect(() => {
    fetchAll();
    // Poll frequently so status changes (played/reverted), speaker online/offline,
    // and scheduled plays firing all appear without a manual refresh. Only poll
    // when the tab is actually visible — no wasted requests in background tabs.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAll();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const needsReview = recordings.filter(r => r.status === 'pending_review');
  const decided = recordings.filter(r => r.status === 'scheduled' || r.status === 'rejected');
  const history = recordings.filter(r => r.status === 'played' || r.status === 'cancelled');

  return (
    <div>
      {showHeader && baby && (
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.text }}>{baby.first_name} {baby.last_name}</h1>
          <p style={{ margin: '4px 0 0', color: c.textMuted, fontSize: 14 }}>
            Room {baby.room_number} · {baby.gender}{baby.record_number ? ` · ID ${baby.record_number}` : ''}
          </p>
        </div>
      )}

      {baby && (
        <div style={{ marginBottom: 22, padding: '12px 16px', background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: theme.radius.md, boxShadow: theme.shadow.sm }}>
          <SpeakerStatus state={deviceState} roomNumber={baby.room_number} />
        </div>
      )}

      {error && <p style={{ color: c.danger }}>{error}</p>}

      {loading && !baby ? (
        <Spinner label="Loading messages…" />
      ) : (
        <>
          <SectionTitle count={needsReview.length} tone="warn">Needs review</SectionTitle>
          {needsReview.length === 0
            ? <p style={{ color: c.textFaint, fontSize: 14, marginBottom: 24 }}>Nothing waiting for review right now.</p>
            : needsReview.map(r => <RecordingCard key={r.id} recording={r} deviceState={deviceState} onChanged={fetchAll} />)}

          {decided.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SectionTitle>Scheduled &amp; declined</SectionTitle>
              {decided.map(r => <RecordingCard key={r.id} recording={r} deviceState={deviceState} onChanged={fetchAll} />)}
            </div>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SectionTitle>History</SectionTitle>
              {history.map(r => <RecordingCard key={r.id} recording={r} deviceState={deviceState} onChanged={fetchAll} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
