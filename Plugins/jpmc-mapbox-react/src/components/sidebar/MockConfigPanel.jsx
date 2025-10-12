import React, { useMemo } from 'react';

const panelStyle = {
  position: 'absolute',
  top: '80px',
  right: '16px',
  width: '320px',
  maxHeight: '80vh',
  overflowY: 'auto',
  padding: '1rem 1.25rem',
  borderRadius: '18px',
  background: 'rgba(12, 18, 32, 0.94)',
  boxShadow: '0 18px 42px rgba(15, 23, 42, 0.45)',
  color: '#f8fafc',
  zIndex: 6,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.75rem',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  marginBottom: '0.75rem',
  fontSize: '0.8rem',
};

const inputStyle = {
  padding: '0.45rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.4)',
  background: 'rgba(15, 23, 42, 0.4)',
  color: '#f8fafc',
};

const MockConfigPanel = ({ open, onClose, config, onUpdate }) => {
  const layerKeys = useMemo(() => ['layer1', 'layer2', 'layer3', 'layer4'], []);

  if (!open) {
    return null;
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Mock Configuration</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close mock configuration panel"
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

      <div style={{ fontSize: '0.75rem', opacity: 0.75, marginBottom: '1rem' }}>
        Updates here only impact the local mock client. In Sigma, authors configure the plugin via the editor panel.
      </div>

      <div style={fieldStyle}>
        <label htmlFor="mock-basemap">Basemap URL</label>
        <input
          id="mock-basemap"
          style={inputStyle}
          type="text"
          value={config.basemapUrl ?? ''}
          onChange={event => onUpdate({ basemapUrl: event.target.value })}
        />
      </div>

      <label style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={Boolean(config.clusterPoints)}
          onChange={event => onUpdate({ clusterPoints: event.target.checked })}
        />
        <span>Cluster Points</span>
      </label>

      <div style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '12px',
        padding: '0.75rem',
        marginBottom: '0.75rem',
        background: 'rgba(15, 23, 42, 0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Scatter Layer</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <input
              type="checkbox"
              checked={Boolean(config.scatterLayerEnabled)}
              onChange={event => onUpdate({ scatterLayerEnabled: event.target.checked })}
            />
            <span>Enabled</span>
          </label>
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-title">Layer Title</label>
          <input
            id="scatter-title"
            style={inputStyle}
            type="text"
            value={config.scatterLayerTitle ?? ''}
            onChange={event => onUpdate({ scatterLayerTitle: event.target.value })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-source">Source Element ID</label>
          <input
            id="scatter-source"
            style={inputStyle}
            type="text"
            value={config.scatterSource ?? ''}
            onChange={event => onUpdate({ scatterSource: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-lat">Latitude Column</label>
          <input
            id="scatter-lat"
            style={inputStyle}
            type="text"
            value={config.scatterLatitude ?? ''}
            onChange={event => onUpdate({ scatterLatitude: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-lon">Longitude Column</label>
          <input
            id="scatter-lon"
            style={inputStyle}
            type="text"
            value={config.scatterLongitude ?? ''}
            onChange={event => onUpdate({ scatterLongitude: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-legend">Legend Column</label>
          <input
            id="scatter-legend"
            style={inputStyle}
            type="text"
            value={config.scatterLegend ?? ''}
            onChange={event => onUpdate({ scatterLegend: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="mock-filter-lat">Latitude Variable</label>
          <input
            id="mock-filter-lat"
            style={inputStyle}
            type="text"
            value={config.filterLatitude ?? ''}
            onChange={event => onUpdate({ filterLatitude: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="mock-filter-lon">Longitude Variable</label>
          <input
            id="mock-filter-lon"
            style={inputStyle}
            type="text"
            value={config.filterLongitude ?? ''}
            onChange={event => onUpdate({ filterLongitude: event.target.value || null })}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="scatter-point-type">Point Type</label>
          <select
            id="scatter-point-type"
            style={inputStyle}
            value={config.scatterPointType ?? 'Circle'}
            onChange={event => onUpdate({ scatterPointType: event.target.value })}
          >
            <option value="Circle">Circle</option>
            <option value="Icon">Icon</option>
          </select>
        </div>
      </div>

      {layerKeys.map((layerKey, index) => {
        const layerTitleKey = `${layerKey}Title`;
        const animateKey = `animateLines${index + 1}`;
        const fillKey = `fillPolygons${index + 1}`;
        const pointTypeKey = `pointType${index + 1}`;

        return (
          <div key={layerKey} style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '12px',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            background: 'rgba(15, 23, 42, 0.35)',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {config[layerTitleKey] || `Layer ${index + 1}`}
            </div>
            <div style={fieldStyle}>
              <label htmlFor={`${layerKey}-title`}>Title</label>
              <input
                id={`${layerKey}-title`}
                style={inputStyle}
                type="text"
                value={config[layerTitleKey] ?? ''}
                onChange={event => onUpdate({ [layerTitleKey]: event.target.value })}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={Boolean(config[animateKey])}
                onChange={event => onUpdate({ [animateKey]: event.target.checked })}
              />
              <span style={{ fontSize: '0.8rem' }}>Animate Lines</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={Boolean(config[fillKey])}
                onChange={event => onUpdate({ [fillKey]: event.target.checked })}
              />
              <span style={{ fontSize: '0.8rem' }}>Fill Polygons</span>
            </label>
            <div style={fieldStyle}>
              <label htmlFor={`${layerKey}-point-type`}>Point Type</label>
              <select
                id={`${layerKey}-point-type`}
                style={inputStyle}
                value={config[pointTypeKey] ?? 'Circle'}
                onChange={event => onUpdate({ [pointTypeKey]: event.target.value })}
              >
                <option value="Circle">Circle</option>
                <option value="Icon">Icon</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MockConfigPanel;
