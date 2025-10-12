import React from 'react';
import DOMPurify from 'dompurify';

const tooltipContainerStyle = {
  position: 'absolute',
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#f8fafc',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  minWidth: '200px',
  maxWidth: '280px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
  fontSize: '0.8rem',
  zIndex: 7,
  pointerEvents: 'none',
  lineHeight: 1.45,
};

const sanitizeHtml = value => {
  try {
    return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } });
  } catch (error) {
    console.warn('[Tooltip] Failed to sanitize tooltip content', error);
    return '';
  }
};

const Tooltip = ({ tooltip }) => {
  const { feature, visible, position } = tooltip ?? {};
  const rawTooltip = feature?.properties?.tooltip;

  if (!visible || !feature || !rawTooltip) {
    return null;
  }

  const { left, top } = position;

  let tooltipHtml = '';
  if (typeof rawTooltip === 'string') {
    tooltipHtml = sanitizeHtml(rawTooltip);
  } else {
    tooltipHtml = sanitizeHtml(JSON.stringify(rawTooltip, null, 2).replace(/\n/g, '<br />'));
  }

  return (
    <div style={{ ...tooltipContainerStyle, left, top }}>
      <div dangerouslySetInnerHTML={{ __html: tooltipHtml }} />
    </div>
  );
};

export default Tooltip;
