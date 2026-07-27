import { Sun, Moon } from 'lucide-react';
import { theme } from '../../theme';
import { useThemeMode } from '../../hooks/useThemeMode';

// Small icon button to switch dark/light. Sits in the top bar and on auth pages.
export function ThemeToggle({ style }) {
  const [mode, toggle] = useThemeMode();
  const c = theme.color;
  const isDark = mode === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: theme.radius.sm,
        border: `1.5px solid ${c.border}`, background: c.cardBg, color: c.textMuted,
        cursor: 'pointer', flexShrink: 0, ...style,
      }}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
