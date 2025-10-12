import React from 'react';

const panelStyle = {
  position: 'absolute',
  top: '80px',
  left: '16px',
  padding: '1rem',
  borderRadius: '18px',
  background: 'rgba(15, 23, 42, 0.92)',
  boxShadow: '0 18px 42px rgba(15, 23, 42, 0.45)',
  color: 'var(--menu-text, #f8fafc)',
  minWidth: '240px',
  zIndex: 6,
};

const checkboxRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const LayerVisibilityPanel = ({ visible, layers, onToggle, onClose }) => {
  if (!visible) {
    return null;
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Layer Visibility</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layer visibility panel"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f8fafc',
            fontSize: '1.2rem',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      {layers.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>No layers currently rendered.</p>}
      {layers.map(layer => (
        <label key={layer.key} style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={layer.visible !== false}
            onChange={() => onToggle(layer.key)}
          />
          <span>{layer.title || layer.key}</span>
        </label>
      ))}
    </div>
  );
};

export default LayerVisibilityPanel;
