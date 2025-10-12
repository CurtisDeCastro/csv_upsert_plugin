import React, { useEffect } from 'react';
import { DEFAULT_BASEMAP } from '../map/constants.js';

const MapView = ({
  containerRef,
  mapService,
  basemapUrl = DEFAULT_BASEMAP,
  onReadyChange,
  onMapClick,
}) => {
  useEffect(() => {
    let mapInstance = null;
    let cancelled = false;

    const initialize = async () => {
      if (!containerRef.current) {
        return;
      }

      onReadyChange?.(false, null);
      mapInstance = await mapService.initMap(containerRef.current, basemapUrl);
      if (cancelled) {
        return;
      }

      const handleLoad = () => {
        if (!cancelled) {
          onReadyChange?.(true, mapInstance);
        }
      };

      const handleClick = event => {
        onMapClick?.(event);
      };

      mapInstance.on('load', handleLoad);
      mapInstance.on('click', handleClick);

      return () => {
        mapInstance.off('load', handleLoad);
        mapInstance.off('click', handleClick);
      };
    };

    let teardown = () => {};

    initialize().then(cleanup => {
      if (typeof cleanup === 'function') {
        teardown = cleanup;
      }
    });

    return () => {
      cancelled = true;
      teardown();
      onReadyChange?.(false, null);
      mapService.dispose();
    };
  }, [basemapUrl, containerRef, mapService, onMapClick, onReadyChange]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default MapView;
