import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { CoBrandingFooter } from '../../components/layout/CoBranding';
import NurseDashboard from './NurseDashboard';
import RoomView from './RoomView';
import RecordingQueue from './RecordingQueue';

// Defines the nested URL structure for the nurse section and wraps every
// nurse page in the shared top bar.
export default function NurseLayout() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppTopBar roleLabel="Nurse" userName={user.first_name} />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route index element={<NurseDashboard />} />
          <Route path="rooms/:roomId" element={<RoomView />} />
          <Route path="rooms/:roomId/babies/:babyId" element={<RecordingQueue />} />
        </Routes>
      </div>
      <CoBrandingFooter />
    </div>
  );
}
