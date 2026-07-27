import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { theme } from '../../theme';
import RecordingsPanel from '../../components/recordings/RecordingsPanel';

const c = theme.color;

// Admin view of one baby's recordings — same review/play/stop powers as a nurse.
export default function AdminBabyRecordings() {
  const { babyId } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate('/admin/babies')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: c.accent, cursor: 'pointer', padding: 0, marginBottom: 18, fontSize: 14, fontWeight: 600 }}
      >
        <ChevronLeft size={16} /> Back to babies
      </button>

      <RecordingsPanel babyId={babyId} />
    </div>
  );
}
