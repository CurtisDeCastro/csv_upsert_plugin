import React from 'react';

const baseButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'background 160ms ease, color 160ms ease',
};

const MainMenu = ({
  open,
  onToggle,
  onLegendToggle,
  legendVisible,
  onLayerSelectorToggle,
  onMockConfigToggle,
  showMockControls,
}) => {
  const menuBg = 'var(--menu-bg, rgba(61, 41, 61, 0.92))';
  const menuText = 'var(--menu-text, #ffffff)';
  const menuAccent = 'var(--menu-accent, #f59a23)';

  const buttonStyle = {
    ...baseButtonStyle,
    background: menuBg,
    color: menuText,
  };

  return (
    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 5 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: 'none',
          background: menuBg,
          color: menuText,
          cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.35)',
        }}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {open && (
        <div
          style={{
            marginTop: '12px',
            padding: '1rem',
            borderRadius: '18px',
            background: 'rgba(15, 23, 42, 0.92)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.45)',
            minWidth: '220px',
            color: menuText,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: menuAccent }}>Map Controls</div>
          <button type="button" onClick={onLegendToggle} style={buttonStyle}>
            <span role="img" aria-hidden="true">🗺️</span>
            <span>{legendVisible ? 'Hide Legend' : 'Show Legend'}</span>
          </button>
          <button type="button" onClick={onLayerSelectorToggle} style={buttonStyle}>
            <span role="img" aria-hidden="true">🧭</span>
            <span>Layer Visibility</span>
          </button>
          {showMockControls && (
            <button type="button" onClick={onMockConfigToggle} style={buttonStyle}>
              <span role="img" aria-hidden="true">🛠️</span>
              <span>Mock Config</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MainMenu;
