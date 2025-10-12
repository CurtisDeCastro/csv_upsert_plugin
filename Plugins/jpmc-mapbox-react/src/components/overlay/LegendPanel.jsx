import React from 'react';
import DOMPurify from 'dompurify';

const LegendPanel = ({ html, visible }) => {
  if (!visible || !html) {
    return null;
  }

  const sanitizedHtml = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  if (!sanitizedHtml) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        maxWidth: '320px',
        maxHeight: '45vh',
        overflowY: 'auto',
        padding: '1rem',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.94)',
        boxShadow: '0 18px 42px rgba(15, 23, 42, 0.35)',
        color: '#0f172a',
        zIndex: 4,
        fontSize: '0.85rem',
        lineHeight: 1.4,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default LegendPanel;
