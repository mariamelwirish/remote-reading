import { X } from 'lucide-react';
import { theme } from '../../theme';

export function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, background: theme.color.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: theme.color.cardBg, borderRadius: theme.radius.lg, padding: 28,
          width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: theme.shadow.lg, border: `1px solid ${theme.color.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.color.text }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: theme.color.textMuted,
              lineHeight: 0, padding: 4, borderRadius: theme.radius.sm, display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
