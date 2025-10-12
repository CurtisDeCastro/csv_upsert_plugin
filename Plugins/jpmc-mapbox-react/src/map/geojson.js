const safeParse = value => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[GeoJSON] Failed to parse value', error);
      return null;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
};

export const extractGeoJsons = elementData => {
  if (!elementData || typeof elementData !== 'object') {
    return [];
  }

  return Object.values(elementData)
    .flat()
    .map(safeParse)
    .filter(Boolean);
};

export const flattenFeatures = geoJson => {
  if (!geoJson) {
    return [];
  }

  if (geoJson.type === 'FeatureCollection') {
    return (geoJson.features ?? []).flatMap(flattenFeatures);
  }

  if (geoJson.type === 'Feature') {
    const { geometry } = geoJson;
    if (!geometry) {
      return [];
    }

    if (geometry.type === 'GeometryCollection') {
      return (geometry.geometries ?? []).map(innerGeometry => ({
        type: 'Feature',
        properties: geoJson.properties ?? {},
        geometry: innerGeometry,
      }));
    }

    return [geoJson];
  }

  if (geoJson.type && geoJson.coordinates) {
    return [
      {
        type: 'Feature',
        properties: {},
        geometry: geoJson,
      },
    ];
  }

  return [];
};
