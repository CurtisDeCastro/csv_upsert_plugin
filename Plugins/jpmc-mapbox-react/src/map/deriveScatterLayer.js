const CATEGORY_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0ea5e9', '#d946ef', '#f97316'];

const parseCell = value => {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [value];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed === null || parsed === undefined) {
        return [];
      }
      return [parsed];
    } catch {
      return [trimmed];
    }
  }
  return [];
};

const extractColumnValues = column => {
  if (!Array.isArray(column)) {
    return [];
  }
  return column.flatMap(parseCell).filter(value => value !== null && value !== undefined);
};

const toNumber = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getColorForCategory = (category, palette, colorCache) => {
  const key = category ?? '__default__';
  if (colorCache.has(key)) {
    return colorCache.get(key);
  }
  const nextColor = palette[colorCache.size % palette.length];
  colorCache.set(key, nextColor);
  return nextColor;
};

export const deriveScatterFeatureCollection = (
  elementData,
  {
    latitudeColumn,
    longitudeColumn,
    legendColumn,
    pointRadius = 6,
    pointStrokeWidth = 1,
    pointStrokeColor = '#111827',
    palette = CATEGORY_COLORS,
  },
) => {
  if (!elementData || !latitudeColumn || !longitudeColumn) {
    return null;
  }

  const latColumn = elementData[latitudeColumn];
  const lonColumn = elementData[longitudeColumn];
  if (!latColumn || !lonColumn) {
    return null;
  }

  const latitudes = extractColumnValues(latColumn);
  const longitudes = extractColumnValues(lonColumn);
  if (latitudes.length === 0 || longitudes.length === 0) {
    return null;
  }

  const legendValues = legendColumn ? extractColumnValues(elementData[legendColumn]) : [];
  const colorCache = new Map();
  const features = [];
  const total = Math.min(latitudes.length, longitudes.length);

  for (let index = 0; index < total; index += 1) {
    const latitude = toNumber(latitudes[index]);
    const longitude = toNumber(longitudes[index]);
    if (latitude === null || longitude === null) {
      continue;
    }

    const legend = legendValues[index] ?? null;
    const circleColor = getColorForCategory(legend, palette, colorCache);

    features.push({
      type: 'Feature',
      properties: {
        legend,
        'circle-color': circleColor,
        'circle-radius': pointRadius,
        'circle-stroke-width': pointStrokeWidth,
        'circle-stroke-color': pointStrokeColor,
        'circle-opacity': 0.9,
        pin_type: 'User',
        pin_color: circleColor,
      },
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });
  }

  if (features.length === 0) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};
