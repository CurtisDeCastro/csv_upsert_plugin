import { useEffect, useState } from 'react';

export const useSigmaElementData = (elementId, client) => {
  const [data, setData] = useState({});

  useEffect(() => {
    if (!client || !elementId) {
      setData({});
      return () => {};
    }

    let isMounted = true;
    const unsubscribe = client.elements?.subscribeToElementData?.(elementId, payload => {
      if (isMounted) {
        setData(payload ?? {});
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [client, elementId]);

  return data ?? {};
};
