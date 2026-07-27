import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Mail, CheckCircle2, AlertTriangle, Activity, Baby as BabyIcon,
  Users as UsersIcon, Stethoscope, Clock,
} from 'lucide-react';
import api from '../../../api/client';
import { theme } from '../../../theme';
import { Modal } from '../../../components/ui/Modal';
import { Button, Badge, Field, Select, Spinner, EmptyState, PageHeader } from '../../../components/ui';

const c = theme.color;

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// Account status → friendly badge.
function AccountBadge({ user }) {
  if (!user.invite_used) return <Badge tone="warn">Invite pending</Badge>;
  if (!user.is_active) return <Badge tone="neutral">Deactivated</Badge>;
  return <Badge tone="success">Active</Badge>;
}

/* ----------------------- SES-aware result note ----------------------- */
function emailProbablyFailed(message = '') {
  return /email/i.test(message) && /(fail|not sent|couldn|could not)/i.test(message);
}
function ResultNote({ result }) {
  if (!result) return null;
  const { ok, message } = result;
  const softEmailFail = ok && emailProbablyFailed(message);
  const tone = !ok ? { bg: c.dangerSoft, fg: c.danger, Icon: AlertTriangle }
    : softEmailFail ? { bg: c.warnSoft, fg: c.warn, Icon: AlertTriangle }
    : { bg: c.successSoft, fg: c.success, Icon: CheckCircle2 };
  const text = softEmailFail
    ? 'Account created — but we couldn’t send the invite email automatically. Use “Resend invite” once email is set up, or share their login details directly.'
    : message;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: tone.bg, color: tone.fg, padding: '10px 14px', borderRadius: theme.radius.sm, fontSize: 13, margin: '14px 0 0' }}>
      <tone.Icon size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------ Modals ------------------------------- */
function AddNurseModal({ onClose, onDone }) {
  const [fields, setFields] = useState({ first_name: '', last_name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/nurses', fields);
      setResult({ ok: true, message: data.message });
      setFields({ first_name: '', last_name: '', email: '' });
      onDone?.();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to create nurse.' });
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Add a nurse" onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name" value={fields.first_name} onChange={set('first_name')} required />
          <Field label="Last name" value={fields.last_name} onChange={set('last_name')} required />
        </div>
        <Field label="Email" type="email" value={fields.email} onChange={set('email')} required style={{ marginTop: 12 }} />
        <ResultNote result={result} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={loading} icon={<UserPlus size={16} />}>{loading ? 'Creating…' : 'Create & invite'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddParentModal({ onClose, onDone }) {
  const [babies, setBabies] = useState([]);
  const [fields, setFields] = useState({ first_name: '', last_name: '', email: '', baby_id: '', relationship: 'primary' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/babies', { params: { status: 'active' } }).then(({ data }) => setBabies(data)).catch(() => {});
  }, []);
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/parents', fields);
      setResult({ ok: true, message: data.message });
      setFields({ first_name: '', last_name: '', email: '', baby_id: '', relationship: 'primary' });
      onDone?.();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to add parent.' });
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Add a parent" onClose={onClose}>
      <form onSubmit={submit}>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: c.textMuted }}>
          If the parent already has an account, just their email and the baby are needed. A name is required only for brand-new accounts.
        </p>
        <Field label="Email" type="email" value={fields.email} onChange={set('email')} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Field label="First name" hint="New accounts only" value={fields.first_name} onChange={set('first_name')} />
          <Field label="Last name" hint="New accounts only" value={fields.last_name} onChange={set('last_name')} />
        </div>
        <Select
          label="Baby" searchable required value={fields.baby_id}
          onChange={(v) => setFields(f => ({ ...f, baby_id: v }))}
          searchPlaceholder="Search by ID or name…" emptyText="No babies found" style={{ marginTop: 12 }}
          options={babies.map(b => ({ value: b.id, label: `${b.first_name} ${b.last_name}`, sublabel: b.record_number, keywords: `${b.record_number ?? ''} ${b.first_name} ${b.last_name}` }))}
        />
        <Select
          label="Relationship" value={fields.relationship}
          onChange={(v) => setFields(f => ({ ...f, relationship: v }))} style={{ marginTop: 12 }}
          options={[{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }]}
        />
        <ResultNote result={result} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={loading} icon={<UserPlus size={16} />}>{loading ? 'Adding…' : 'Add parent'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResendInviteModal({ email, onClose }) {
  const [value, setValue] = useState(email ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/admin/resend-invite', { email: value });
      setResult({ ok: true, message: data.message });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error ?? 'Failed to resend invite.' });
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Resend invite" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Account email" type="email" value={value} onChange={e => setValue(e.target.value)} required />
        <ResultNote result={result} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={loading} icon={<Mail size={16} />}>{loading ? 'Sending…' : 'Resend invite'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// What a nurse's action means, in plain language.
const ACTION_LABEL = {
  scheduled: 'Scheduled a message',
  rejected: 'Declined a message',
  played: 'Played a message',
  pending_review: 'Returned a message to review',
  cancelled: 'Cancelled a message',
};
const ACTION_TONE = { scheduled: 'info', rejected: 'danger', played: 'success', pending_review: 'warn', cancelled: 'neutral' };

function NurseActivityModal({ nurse, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/nurses/${nurse.id}/activity`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Couldn’t load this nurse’s activity.'));
  }, [nurse.id]);

  return (
    <Modal title={`${nurse.first_name} ${nurse.last_name} — activity`} onClose={onClose} maxWidth={620}>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: c.textMuted }}>
        {nurse.hospital_id} · {nurse.email}
      </p>
      {error && <p style={{ color: c.danger }}>{error}</p>}
      {!data && !error && <Spinner label="Loading activity…" />}
      {data && data.activity.length === 0 && (
        <EmptyState icon={<Activity size={30} color={c.textFaint} />} title="No activity yet" hint="This nurse hasn’t reviewed or played any messages." />
      )}
      {data && data.activity.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
          {data.activity.map(a => (
            <div key={a.id} style={{ border: `1px solid ${c.border}`, borderRadius: theme.radius.md, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={ACTION_TONE[a.to_status] ?? 'neutral'}>{ACTION_LABEL[a.to_status] ?? a.to_status}</Badge>
                <span style={{ fontSize: 12, color: c.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {fmtDateTime(a.changed_at)}
                </span>
              </div>
              <div style={{ fontSize: 14, color: c.text, marginTop: 8 }}>
                “{a.recording_title}” for <strong>{a.baby_first_name} {a.baby_last_name}</strong>
                {a.record_number && <span style={{ color: c.textMuted }}> ({a.record_number})</span>}
              </div>
              {a.note && <div style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>Note: {a.note}</div>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------ Rosters ------------------------------ */
const th = { padding: '10px 14px', color: c.textMuted, fontWeight: 700, fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '12px 14px', color: c.text, fontSize: 14, verticalAlign: 'middle' };

function TableWrap({ children }) {
  return (
    <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: theme.radius.lg, boxShadow: theme.shadow.md, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      </div>
    </div>
  );
}

function NursesView() {
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { type, nurse? }

  const fetchNurses = useCallback(() => {
    setLoading(true);
    api.get('/admin/nurses').then(({ data }) => setNurses(data)).catch(() => setError('Couldn’t load nurses.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetchNurses(); }, [fetchNurses]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<UserPlus size={16} />} onClick={() => setModal({ type: 'add' })}>Add nurse</Button>
      </div>
      {error && <p style={{ color: c.danger }}>{error}</p>}
      {loading ? <Spinner /> : nurses.length === 0 ? (
        <EmptyState icon={<Stethoscope size={34} color={c.textFaint} />} title="No nurses yet" hint="Add a nurse to get started." />
      ) : (
        <TableWrap>
          <thead>
            <tr style={{ background: c.subtleBg }}>
              {['Name', 'ID', 'Email', 'Status', 'Work done', 'Last active', ''].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {nurses.map(n => (
              <tr key={n.id} style={{ borderTop: `1px solid ${c.border}` }}>
                <td style={{ ...td, fontWeight: 700 }}>{n.first_name} {n.last_name}</td>
                <td style={{ ...td, color: c.textMuted }}>{n.hospital_id}</td>
                <td style={{ ...td, color: c.textMuted }}>{n.email}</td>
                <td style={td}><AccountBadge user={n} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Badge tone="info">{Number(n.scheduled_count)} scheduled</Badge>
                    <Badge tone="success">{Number(n.played_count)} played</Badge>
                    <Badge tone="danger">{Number(n.rejected_count)} declined</Badge>
                  </div>
                </td>
                <td style={{ ...td, color: c.textMuted }}>{n.last_action_at ? fmtDate(n.last_action_at) : '—'}</td>
                <td style={td}>
                  <Button size="sm" variant="ghost" icon={<Activity size={13} />} onClick={() => setModal({ type: 'activity', nurse: n })}>Activity</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {modal?.type === 'add' && <AddNurseModal onClose={() => setModal(null)} onDone={fetchNurses} />}
      {modal?.type === 'activity' && <NurseActivityModal nurse={modal.nurse} onClose={() => setModal(null)} />}
    </div>
  );
}

function ParentsView() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { type, email? }

  const fetchParents = useCallback(() => {
    setLoading(true);
    api.get('/admin/parents').then(({ data }) => setParents(data)).catch(() => setError('Couldn’t load parents.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetchParents(); }, [fetchParents]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<UserPlus size={16} />} onClick={() => setModal({ type: 'add' })}>Add parent</Button>
      </div>
      {error && <p style={{ color: c.danger }}>{error}</p>}
      {loading ? <Spinner /> : parents.length === 0 ? (
        <EmptyState icon={<UsersIcon size={34} color={c.textFaint} />} title="No parents yet" hint="Add a parent and link them to a baby." />
      ) : (
        <TableWrap>
          <thead>
            <tr style={{ background: c.subtleBg }}>
              {['Name', 'ID', 'Email', 'Linked babies', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {parents.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${c.border}` }}>
                <td style={{ ...td, fontWeight: 700 }}>{p.first_name} {p.last_name}</td>
                <td style={{ ...td, color: c.textMuted }}>{p.hospital_id}</td>
                <td style={{ ...td, color: c.textMuted }}>{p.email}</td>
                <td style={td}>
                  {p.babies.length === 0 ? <span style={{ color: c.textFaint }}>Not linked</span> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {p.babies.map(b => (
                        <span key={b.baby_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <BabyIcon size={13} color={c.accent} />
                          <span style={{ fontWeight: 600 }}>{b.first_name} {b.last_name}</span>
                          <span style={{ color: c.textMuted }}>{b.record_number}</span>
                          <Badge tone={b.relationship === 'primary' ? 'accent' : 'neutral'}>{b.relationship}</Badge>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={td}><AccountBadge user={p} /></td>
                <td style={td}>
                  {!p.invite_used && (
                    <Button size="sm" variant="ghost" icon={<Mail size={13} />} onClick={() => setModal({ type: 'resend', email: p.email })}>Resend invite</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {modal?.type === 'add' && <AddParentModal onClose={() => setModal(null)} onDone={fetchParents} />}
      {modal?.type === 'resend' && <ResendInviteModal email={modal.email} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ------------------------------- Tab -------------------------------- */
const SUBTABS = [
  { key: 'nurses', label: 'Nurses', icon: Stethoscope },
  { key: 'parents', label: 'Parents', icon: UsersIcon },
];

export default function UsersTab() {
  const [view, setView] = useState('nurses');

  return (
    <div>
      <PageHeader title="People" subtitle="Nurses, parents, and who’s linked to which baby" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {SUBTABS.map(t => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: theme.radius.pill, border: `1.5px solid ${active ? c.accent : c.border}`,
                background: active ? c.accentSoft : c.cardBg, color: active ? c.accent : c.textMuted,
                cursor: 'pointer', fontSize: 14, fontWeight: active ? 800 : 600,
              }}
            >
              <t.icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {view === 'nurses' ? <NursesView /> : <ParentsView />}
    </div>
  );
}
