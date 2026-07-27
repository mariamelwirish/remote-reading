import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { theme } from '../theme';
import { AuthShell } from '../components/layout/AuthShell';
import { Button, Field } from '../components/ui';

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
      <AuthShell title="Invite link not valid">
        <p style={{ color: theme.color.textMuted, fontSize: 14, margin: 0 }}>
          This activation link is missing or incomplete. Please ask the hospital to send you a new invitation.
        </p>
      </AuthShell>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    if (password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.error ?? 'We couldn’t activate your account. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell title="You’re all set">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.color.success }}>
          <CheckCircle2 size={28} />
          <div style={{ color: theme.color.text, fontSize: 14 }}>
            Your account is active. Taking you to sign in…
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Activate your account" subtitle="Choose a password to finish setting up">
      <form onSubmit={handleSubmit}>
        <Field
          label="Create password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          hint="At least 8 characters"
          placeholder="Create a password"
          leftIcon={<Lock size={16} color={theme.color.textMuted} />}
          style={{ marginBottom: 14 }}
        />
        <Field
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Re-enter your password"
          leftIcon={<Lock size={16} color={theme.color.textMuted} />}
          style={{ marginBottom: 18 }}
        />
        {error && (
          <p style={{ color: theme.color.danger, background: theme.color.dangerSoft, padding: '8px 12px', borderRadius: theme.radius.sm, fontSize: 13, margin: '0 0 14px' }}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </AuthShell>
  );
}
