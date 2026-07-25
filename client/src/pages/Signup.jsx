import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 16px' }}>
        <p>Invalid invite link. Please request a new one from the hospital.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Activation failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 16px' }}>
        <p>Account activated! Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Remote Reading for Newborns</h1>
      <h2 style={{ marginBottom: 24 }}>Activate Your Account</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Create Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="confirm">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px' }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Activating…' : 'Activate Account'}
        </button>
      </form>
    </div>
  );
}
