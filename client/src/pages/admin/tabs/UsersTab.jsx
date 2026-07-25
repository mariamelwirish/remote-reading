import { useState, useEffect } from 'react';
import api from '../../../api/client';

const inp = { display: 'block', width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', marginTop: 4, fontSize: 14 };
const primaryBtn = { padding: '8px 18px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 };

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '0.95rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function AddNurseForm() {
  const [fields, setFields] = useState({ first_name: '', last_name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, message: str }

  function set(key) { return e => setFields(f => ({ ...f, [key]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/nurses', fields);
      setResult({ ok: true, message: data.message });
      setFields({ first_name: '', last_name: '', email: '' });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to create nurse.' });
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="First Name">
          <input type="text" value={fields.first_name} onChange={set('first_name')} required style={inp} />
        </FormField>
        <FormField label="Last Name">
          <input type="text" value={fields.last_name} onChange={set('last_name')} required style={inp} />
        </FormField>
      </div>
      <FormField label="Email">
        <input type="email" value={fields.email} onChange={set('email')} required style={inp} />
      </FormField>
      {result && (
        <p style={{ color: result.ok ? '#15803d' : 'red', fontSize: 13, margin: '10px 0' }}>{result.message}</p>
      )}
      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'Creating…' : 'Create & Send Invite'}
      </button>
    </form>
  );
}

function AddParentForm() {
  const [babies, setBabies] = useState([]);
  const [fields, setFields] = useState({
    first_name: '', last_name: '', email: '', baby_id: '', relationship: 'primary',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/babies', { params: { status: 'active' } })
      .then(({ data }) => setBabies(data))
      .catch(() => {});
  }, []);

  function set(key) { return e => setFields(f => ({ ...f, [key]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/parents', fields);
      setResult({ ok: true, message: data.message });
      setFields({ first_name: '', last_name: '', email: '', baby_id: '', relationship: 'primary' });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to add parent.' });
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
        If the parent already has an account, only email + baby link are needed. Name is required for new accounts.
      </p>
      <FormField label="Email">
        <input type="email" value={fields.email} onChange={set('email')} required style={inp} />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="First Name (new accounts only)">
          <input type="text" value={fields.first_name} onChange={set('first_name')} style={inp} />
        </FormField>
        <FormField label="Last Name (new accounts only)">
          <input type="text" value={fields.last_name} onChange={set('last_name')} style={inp} />
        </FormField>
      </div>
      <FormField label="Baby">
        <select value={fields.baby_id} onChange={set('baby_id')} required style={inp}>
          <option value="">Select a baby…</option>
          {babies.map(b => (
            <option key={b.id} value={b.id}>{b.first_name} {b.last_name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Relationship">
        <select value={fields.relationship} onChange={set('relationship')} style={inp}>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </FormField>
      {result && (
        <p style={{ color: result.ok ? '#15803d' : 'red', fontSize: 13, margin: '10px 0' }}>{result.message}</p>
      )}
      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'Adding…' : 'Add Parent'}
      </button>
    </form>
  );
}

function ResendInviteForm() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/resend-invite', { email });
      setResult({ ok: true, message: data.message });
      setEmail('');
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to resend invite.' });
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Account Email">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nurse or parent email" style={inp} />
      </FormField>
      {result && (
        <p style={{ color: result.ok ? '#15803d' : 'red', fontSize: 13, margin: '10px 0' }}>{result.message}</p>
      )}
      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'Sending…' : 'Resend Invite'}
      </button>
    </form>
  );
}

export default function UsersTab() {
  return (
    <div>
      <Section title="Add Nurse">
        <AddNurseForm />
      </Section>
      <Section title="Add Parent">
        <AddParentForm />
      </Section>
      <Section title="Resend Invite">
        <ResendInviteForm />
      </Section>
    </div>
  );
}
