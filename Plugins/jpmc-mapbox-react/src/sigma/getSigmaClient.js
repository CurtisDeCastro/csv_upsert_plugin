import createMockSigmaClient from './mockClient.js';

let cachedClientPromise = null;

const loadSigmaClient = async () => {
  if (typeof window !== 'undefined' && window.__SIGMA_RUNTIME_CLIENT__) {
    return { client: window.__SIGMA_RUNTIME_CLIENT__ };
  }

  try {
    const sigmaModule = await import('@sigmacomputing/plugin');
    if (sigmaModule?.client) {
      return { client: sigmaModule.client };
    }
    // Some builds may export default client
    if (sigmaModule?.default?.client) {
      return { client: sigmaModule.default.client };
    }
  } catch (error) {
    if (import.meta?.env?.MODE !== 'production') {
      console.warn('[Sigma] Falling back to mock client:', error?.message ?? error);
    }
  }

  const mockClient = createMockSigmaClient();
  if (typeof window !== 'undefined') {
    window.__SIGMA_RUNTIME_CLIENT__ = mockClient;
  }
  return { client: mockClient };
};

export const getSigmaClient = () => {
  if (!cachedClientPromise) {
    cachedClientPromise = loadSigmaClient();
  }
  return cachedClientPromise;
};
