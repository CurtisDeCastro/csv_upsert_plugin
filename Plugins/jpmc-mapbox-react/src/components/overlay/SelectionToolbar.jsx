import React from 'react';

const toolbarStyle = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  zIndex: 6,
};

const buttonStyle = isActive => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '12px',
  border: isActive ? '1px solid rgba(59,130,246,0.9)' : '1px solid rgba(148, 163, 184, 0.45)',
  background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(15, 23, 42, 0.6)',
  color: '#f8fafc',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'background 160ms ease, border 160ms ease',
  opacity: isActive ? 1 : 0.92,
});

const SelectionToolbar = ({ lassoActive, onLassoToggle, disabled }) => (
  <div style={toolbarStyle}>
    <button
      type="button"
      onClick={onLassoToggle}
      disabled={disabled}
      style={{
        ...buttonStyle(lassoActive),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : lassoActive ? 1 : 0.92,
      }}
    >
      <span role="img" aria-hidden="true">✏️</span>
      <span>{lassoActive ? 'Disable Lasso' : 'Enable Lasso'}</span>
    </button>
  </div>
);

export default SelectionToolbar;
