import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { theme } from '../../theme';

const c = theme.color;

// Custom themed picker — replaces native <select> everywhere.
//
// Two modes:
//  - default: a themed dropdown button (for short fixed lists: gender, etc.)
//  - searchable: a real SEARCH TEXTBOX (search icon + placeholder). Suggestions
//    drop in as you type. No "Select a …" trigger — it reads as a search box.
//
// options: [{ value, label, sublabel?, keywords? }]
// Rendered via a portal so it's never clipped inside a scrolling modal.
export function Select({
  value, onChange, options = [],
  placeholder = 'Select…', searchable = false, searchPlaceholder = 'Search…',
  disabled = false, emptyText = 'No matches', required = false,
  label, hint, error, style, id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const [hi, setHi] = useState(0);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find(o => o.value === value) || null;
  const selectedLabel = selected?.label ?? '';

  // When closed, the search box reflects the committed selection.
  useEffect(() => { if (!open) setQuery(selectedLabel); }, [open, selectedLabel]);

  const q = query.trim().toLowerCase();
  const showingSelected = !!selected && query === selectedLabel;
  const filtered = (searchable && q && !showingSelected)
    ? options.filter(o =>
        o.label?.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase?.().includes(q) ||
        o.keywords?.toLowerCase?.().includes(q))
    : options;

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    setHi(0);
    const onScrollResize = () => reposition();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    function onDown(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, reposition]);

  function choose(opt) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || (!searchable && e.key === ' ')) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hi]) choose(filtered[hi]); }
  }

  const boxBorder = `1.5px solid ${error ? c.danger : c.border}`;

  // --- Trigger: a search textbox (searchable) or a dropdown button ---
  const trigger = searchable ? (
    <div ref={triggerRef} style={{ position: 'relative', marginTop: label ? 5 : 0 }}>
      <Search size={16} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={searchPlaceholder}
        onFocus={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.select()); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', padding: '10px 12px 10px 38px', fontSize: 14, fontFamily: theme.font.family,
          background: c.cardBg, color: c.text, border: boxBorder, borderRadius: theme.radius.sm, outline: 'none',
        }}
      />
    </div>
  ) : (
    <button
      type="button"
      ref={triggerRef}
      id={id}
      disabled={disabled}
      onClick={() => !disabled && setOpen(o => !o)}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        width: '100%', padding: '10px 12px', marginTop: label ? 5 : 0, textAlign: 'left',
        fontSize: 14, fontFamily: theme.font.family,
        background: c.cardBg, color: selected ? c.text : c.textFaint,
        border: boxBorder, borderRadius: theme.radius.sm,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {selected ? selected.label : placeholder}
      </span>
      <ChevronDown size={16} color={c.textMuted} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
    </button>
  );

  const panel = open && rect && createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width,
        zIndex: 1000, background: c.cardBg, border: `1px solid ${c.border}`,
        borderRadius: theme.radius.md, boxShadow: theme.shadow.lg, overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: c.textMuted, fontSize: 13, textAlign: 'center' }}>{emptyText}</div>
        ) : filtered.map((o, i) => {
          const isSel = o.value === value;
          const isHi = i === hi;
          return (
            <div
              key={o.value}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '9px 10px', borderRadius: theme.radius.sm, cursor: 'pointer',
                background: isHi ? c.subtleBg : 'transparent',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: c.text, fontWeight: isSel ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</div>
                {o.sublabel && <div style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{o.sublabel}</div>}
              </div>
              {isSel && <Check size={16} color={c.accent} style={{ flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );

  const control = (
    <>
      {trigger}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value ?? ''}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        />
      )}
      {panel}
    </>
  );

  if (!label && !hint && !error) return <div style={{ position: 'relative', ...style }}>{control}</div>;

  return (
    <div style={{ position: 'relative', ...style }}>
      {label && <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{label}</span>}
      {control}
      {hint && !error && <span style={{ fontSize: 12, color: c.textMuted, marginTop: 4, display: 'block' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: c.danger, marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}
