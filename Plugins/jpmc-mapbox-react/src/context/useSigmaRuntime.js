import { useContext } from 'react';
import { SigmaContext } from './SigmaContext.js';

export const useSigmaRuntime = () => {
  const context = useContext(SigmaContext);
  if (!context) {
    throw new Error('useSigmaRuntime must be used within a SigmaProvider.');
  }
  return context;
};
