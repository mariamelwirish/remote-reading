import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BabiesTab from './tabs/BabiesTab';
import RoomsTab from './tabs/RoomsTab';
import UsersTab from './tabs/UsersTab';

function tab(isActive) {
  return {
    padding: '8px 20px',
    borderBottom: `2px solid ${isActive ? '#1d4ed8' : 'transparent'}`,
    color: isActive ? '#1d4ed8' : '#6b7280',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: 14,
    transition: 'color 0.15s',
  };
}

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Admin Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Welcome, {user.first_name}</p>
        </div>
        <button onClick={logout} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 28 }}>
        <NavLink to="/admin/babies" style={({ isActive }) => tab(isActive)}>Babies</NavLink>
        <NavLink to="/admin/rooms"  style={({ isActive }) => tab(isActive)}>Rooms</NavLink>
        <NavLink to="/admin/users"  style={({ isActive }) => tab(isActive)}>Users</NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="/admin/babies" replace />} />
        <Route path="babies" element={<BabiesTab />} />
        <Route path="rooms"  element={<RoomsTab />} />
        <Route path="users"  element={<UsersTab />} />
      </Routes>
    </div>
  );
}
