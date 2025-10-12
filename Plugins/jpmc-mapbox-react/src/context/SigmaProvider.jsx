import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SigmaClientProvider } from '@sigmacomputing/plugin';
import { getSigmaClient } from '../sigma/getSigmaClient.js';
import { buildEditorPanelDefinition } from '../config/editorPanelDefinition.js';
import { SigmaContext } from './SigmaContext.js';

export const SigmaProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [config, setConfig] = useState({});
  const [panelDefinition, setPanelDefinition] = useState([]);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    let unsubscribeConfig = null;
    let mounted = true;

    (async () => {
      const { client: resolvedClient } = await getSigmaClient();
      if (!mounted) {
        return;
      }

      setClient(resolvedClient);
      setIsMock(Boolean(resolvedClient?.__isMock));

      const definition = buildEditorPanelDefinition();
      if (resolvedClient?.config?.configureEditorPanel) {
        resolvedClient.config.configureEditorPanel(definition);
      }
      setPanelDefinition(definition);

      const initialConfig = resolvedClient?.config?.get?.() ?? {};
      setConfig(initialConfig);

      if (resolvedClient?.config?.subscribe) {
        unsubscribeConfig = resolvedClient.config.subscribe(latestConfig => {
          setConfig(latestConfig ?? {});
        });
      }
    })();

    return () => {
      mounted = false;
      if (typeof unsubscribeConfig === 'function') {
        unsubscribeConfig();
      }
    };
  }, []);

  const updateConfig = useCallback(
    partialConfig => {
      if (!client) {
        return;
      }

      if (client.__isMock && client.config?.update) {
        client.config.update(partialConfig);
        return;
      }

      console.warn('[Sigma] updateConfig is only available when running with the mock client.');
    },
    [client],
  );

  const contextValue = useMemo(
    () => ({
      client,
      config,
      panelDefinition,
      isMock,
      updateConfig,
    }),
    [client, config, panelDefinition, isMock, updateConfig],
  );

  if (!client) {
    return null;
  }

  return (
    <SigmaClientProvider client={client}>
      <SigmaContext.Provider value={contextValue}>{children}</SigmaContext.Provider>
    </SigmaClientProvider>
  );
};

export default SigmaProvider;
