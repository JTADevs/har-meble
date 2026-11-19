import { useEffect, useState } from 'react';
import { MODULES, STATUSES } from '../../shared/catalog.js';
import { moduleSpec } from '../../shared/kitchen.js';

// --- powiadomienia ------------------------------------------------------------
export function toast(message, tone = 'ok') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, tone, id: Math.random() } }));
}

export function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const t = e.detail;
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3800);
    };
    window.addEventListener('app-toast', on);
    return () => window.removeEventListener('app-toast', on);
  }, []);
  return (
    <div className="toaster">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// --- okno modalne -------------------------------------------------------------
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Zamknij">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.szkic;
  return <span className={`badge badge-${s.tone}`}>{s.name}</span>;
}

export function Segmented({ value, options, onChange, disabled }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}

export function NumberStepper({ value, min, max, step = 1, onChange, unit = 'cm', disabled }) {
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n)) onChange(clamp(Math.round(n)));
    else setText(String(value));
  };
  return (
    <div className="stepper">
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} aria-label="Zmniejsz">
        −
      </button>
      <input
        type="number"
        value={text}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      <span className="stepper-unit">{unit}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} aria-label="Zwiększ">
        +
      </button>
    </div>
  );
}

// Miniaturka frontu szafki rysowana z tej samej specyfikacji co model 3D.
export function ModuleIcon({ type, width, size = 46 }) {
  const s = moduleSpec(type, width || MODULES[type].defaultWidth);
  const W = s.width;
  const H = s.height;
  const k = 88 / Math.max(H, W);
  const ox = (100 - W * k) / 2;
  const oy = (100 - H * k) / 2;
  const Y = (y, h) => oy + (H - y - h) * k;
  return (
    <svg className="module-icon" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x={ox} y={oy} width={W * k} height={H * k} rx="1.5" className="mi-carcass" />
      {s.fronts.length === 0 &&
        s.shelves.map((y) => <line key={y} x1={ox + 2} x2={ox + W * k - 2} y1={Y(y, 0)} y2={Y(y, 0)} className="mi-line" />)}
      {s.appliances
        .filter((a) => a.kind === 'oven' || a.kind === 'microwave')
        .map((a) => (
          <rect key={a.kind + a.y} x={ox + 2} y={Y(a.y, a.h)} width={W * k - 4} height={a.h * k} rx="1" className="mi-appliance" />
        ))}
      {s.fronts.map((f, i) => (
        <rect key={i} x={ox + f.x * k + 0.6} y={Y(f.y, f.h) + 0.6} width={f.w * k - 1.2} height={f.h * k - 1.2} rx="1" className="mi-front" />
      ))}
      {s.top === 'sink' && <rect x={ox + W * k * 0.25} y={oy - 5} width={W * k * 0.5} height="4" rx="1" className="mi-appliance" />}
      {s.top === 'hob' && <rect x={ox + W * k * 0.15} y={oy - 4} width={W * k * 0.7} height="3" className="mi-appliance" />}
    </svg>
  );
}
