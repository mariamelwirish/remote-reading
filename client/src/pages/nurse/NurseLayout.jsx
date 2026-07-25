import { Routes, Route } from 'react-router-dom';
import NurseDashboard from './NurseDashboard';
import RoomView from './RoomView';
import RecordingQueue from './RecordingQueue';

// Defines the nested URL structure for the nurse section.
// The parent route in App.jsx matches /nurse/* and renders this;
// this component then matches the remainder against its own Routes.
export default function NurseLayout() {
  return (
    <Routes>
      <Route index element={<NurseDashboard />} />
      <Route path="rooms/:roomId" element={<RoomView />} />
      <Route path="rooms/:roomId/babies/:babyId" element={<RecordingQueue />} />
    </Routes>
  );
}
