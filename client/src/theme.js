// theme.js — single source of truth for the app's look & feel.
// Colors are CSS variables (defined in index.css, light + dark). Components
// read theme.color.* as var(--rr-*) strings, so toggling html[data-theme]
// reskins the whole app instantly (see useThemeMode / ThemeToggle).

export const theme = {
  color: {
    // Surfaces
    pageBg: 'var(--rr-page-bg)',
    cardBg: 'var(--rr-card-bg)',
    subtleBg: 'var(--rr-subtle-bg)',
    chromeBg: 'var(--rr-chrome-bg)',       // header/footer — darkest surface
    chromeBorder: 'var(--rr-chrome-border)',
    overlay: 'var(--rr-overlay)',

    // Text
    text: 'var(--rr-text)',
    textMuted: 'var(--rr-text-muted)',
    textFaint: 'var(--rr-text-faint)',

    // Brand accent (sage)
    accent: 'var(--rr-accent)',
    accentHover: 'var(--rr-accent-hover)',
    accentSoft: 'var(--rr-accent-soft)',

    // Borders
    border: 'var(--rr-border)',
    borderStrong: 'var(--rr-border-strong)',

    // Semantic
    success: 'var(--rr-success)', successSoft: 'var(--rr-success-soft)',
    warn: 'var(--rr-warn)',       warnSoft: 'var(--rr-warn-soft)',
    danger: 'var(--rr-danger)',   dangerSoft: 'var(--rr-danger-soft)',
    info: 'var(--rr-info)',       infoSoft: 'var(--rr-info-soft)',

    // Live status dots
    online: 'var(--rr-online)',
    offline: 'var(--rr-offline)',
  },

  radius: { sm: 8, md: 12, lg: 16, pill: 999 },

  shadow: {
    sm: '0 1px 3px rgba(30, 25, 20, 0.10)',
    md: '0 4px 16px rgba(30, 25, 20, 0.12)',
    lg: '0 10px 30px rgba(20, 16, 12, 0.20)',
  },

  font: {
    family: '"Nunito", "Segoe UI", system-ui, -apple-system, sans-serif',
  },

  // Friendly, human labels for backend status enums — never show raw values.
  statusLabel: {
    pending_review: 'Waiting for review',
    scheduled: 'Scheduled',
    played: 'Played',
    rejected: 'Not approved',
    cancelled: 'Cancelled',
    active: 'Active',
    discharged: 'Discharged',
  },
};

// Maps a recording/baby status to a Badge tone.
export const statusTone = {
  pending_review: 'warn',
  scheduled: 'info',
  played: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  active: 'success',
  discharged: 'neutral',
};

export default theme;
