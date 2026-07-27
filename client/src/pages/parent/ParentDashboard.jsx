import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/client';
import { theme, statusTone } from '../../theme';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { CoBrandingFooter } from '../../components/layout/CoBranding';
import { Button, Card, Badge, Select, Spinner, EmptyState } from '../../components/ui';
import UploadRecording from './UploadRecording';

const c = theme.color;

const fmt = (val) => val
  ? new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  : '';

// Warm, plain-language explanation of each status for parents.
function statusText(status, babyName) {
  switch (status) {
    case 'pending_review': return 'Waiting for a nurse to review';
    case 'scheduled':      return 'Scheduled to play';
    case 'played':         return `Played for ${babyName}`;
    case 'rejected':       return 'Not approved';
    case 'cancelled':      return 'Cancelled';
    default:               return status;
  }
}

function RecordingCard({ recording, babyName }) {
  const [expanded, setExpanded] = useState(false);
  const scheduledTime = recording.scheduled_time ? new Date(recording.scheduled_time) : null;

  return (
    <Card style={{ marginBottom: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: c.text }}>{recording.title}</div>
          <div style={{ fontSize: 14, color: c.textMuted, marginTop: 2 }}>{recording.description}</div>
        </div>
        <Badge tone={statusTone[recording.status] ?? 'neutral'}>{statusText(recording.status, babyName)}</Badge>
      </div>

      <div style={{ fontSize: 13, color: c.textMuted, marginTop: 10 }}>
        Sent {fmt(recording.uploaded_at)} · {recording.duration_seconds}s
        {recording.status === 'scheduled' && scheduledTime && (
          <span style={{ color: c.info, fontWeight: 700 }}> · Will play {fmt(scheduledTime)}</span>
        )}
        {recording.status === 'played' && recording.reviewed_at && (
          <span style={{ color: c.success, fontWeight: 700 }}> · Played {fmt(recording.reviewed_at)}</span>
        )}
      </div>

      {recording.audio_url && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0 }}
          >
            {expanded ? <>Hide <ChevronUp size={14} /></> : <>Listen back <ChevronDown size={14} /></>}
          </button>
          {expanded && <audio controls src={recording.audio_url} style={{ display: 'block', width: '100%', marginTop: 8 }} />}
        </div>
      )}
    </Card>
  );
}

function RecordingsList({ babyId, babyName, refreshKey }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecordings = useCallback(() => {
    api.get(`/babies/${babyId}/recordings`)
      .then(({ data }) => { setRecordings(data.recordings); setLoading(false); })
      .catch(() => { setError('We couldn’t load your messages.'); setLoading(false); });
  }, [babyId]);

  useEffect(() => {
    setLoading(true);
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 30000);
    return () => clearInterval(interval);
  }, [fetchRecordings, refreshKey]);

  if (loading) return <Spinner label="Loading your messages…" />;
  if (error) return <p style={{ color: c.danger }}>{error}</p>;

  const inProgress = recordings.filter(r => ['pending_review', 'scheduled'].includes(r.status));
  const history    = recordings.filter(r => ['played', 'rejected', 'cancelled'].includes(r.status));

  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: c.text, marginBottom: 12 }}>In progress</h3>
      {inProgress.length === 0
        ? <EmptyState icon={<Heart size={30} color={c.textFaint} />} title="No messages in progress" hint="Record a message and it’ll appear here." />
        : inProgress.map(r => <RecordingCard key={r.id} recording={r} babyName={babyName} />)}

      {history.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: c.text, margin: '28px 0 12px' }}>History</h3>
          {history.map(r => <RecordingCard key={r.id} recording={r} babyName={babyName} />)}
        </>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [babies, setBabies] = useState([]);
  const [selectedBabyId, setSelectedBabyId] = useState(null);
  const [loadingBabies, setLoadingBabies] = useState(true);
  const [babiesError, setBabiesError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get('/babies')
      .then(({ data }) => {
        setBabies(data);
        if (data.length > 0) setSelectedBabyId(data[0].id);
      })
      .catch(() => setBabiesError('We couldn’t load your baby’s information.'))
      .finally(() => setLoadingBabies(false));
  }, []);

  const selectedBaby = babies.find(b => b.id === selectedBabyId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppTopBar roleLabel="Parent" userName={user.first_name} />

      <div style={{ flex: 1, width: '100%', maxWidth: 680, margin: '0 auto', padding: '8px 16px 40px' }}>
        {loadingBabies && <Spinner />}
        {babiesError && <p style={{ color: c.danger }}>{babiesError}</p>}

        {babies.length > 1 && (
          <div style={{ marginBottom: 20, maxWidth: 280 }}>
            <Select
              label="Baby"
              value={selectedBabyId ?? ''}
              onChange={setSelectedBabyId}
              options={babies.map(b => ({ value: b.id, label: `${b.first_name} ${b.last_name}`, sublabel: b.record_number }))}
            />
          </div>
        )}

        {babies.length === 0 && !loadingBabies && (
          <EmptyState
            icon={<Heart size={34} color={c.textFaint} />}
            title="You’re not linked to a baby yet"
            hint="Please ask the nursing staff to connect your account to your baby."
          />
        )}

        {selectedBaby && (
          <>
            <Card style={{ marginBottom: 22, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: c.accentSoft, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: c.text }}>{selectedBaby.first_name} {selectedBaby.last_name}</div>
                  <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selectedBaby.room_number && <span>Room {selectedBaby.room_number}</span>}
                    <Badge tone={selectedBaby.status === 'active' ? 'success' : 'neutral'}>
                      {selectedBaby.status === 'active' ? 'Active' : 'Discharged'}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedBaby.status === 'active' && (
                <Button icon={<Plus size={16} />} onClick={() => setShowUpload(true)}>New message</Button>
              )}
            </Card>

            <RecordingsList babyId={selectedBabyId} babyName={selectedBaby.first_name} refreshKey={refreshKey} />
          </>
        )}
      </div>

      <CoBrandingFooter />

      {showUpload && selectedBaby && (
        <UploadRecording
          baby={selectedBaby}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
