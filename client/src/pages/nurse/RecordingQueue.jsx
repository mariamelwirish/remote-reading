import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { theme } from '../../theme';
import RecordingsPanel from '../../components/recordings/RecordingsPanel';

const c = theme.color;

export default function RecordingQueue() {
  const { roomId, babyId } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 16px 40px' }}>
      <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/nurse')} style={{ background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <ChevronLeft size={14} /> Rooms
        </button>
        <span>/</span>
        <button onClick={() => navigate(`/nurse/rooms/${roomId}`)} style={{ background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Room</button>
      </div>

      <RecordingsPanel babyId={babyId} />
    </div>
  );
}
