import { useState, useEffect } from 'react';
import { runScan } from '../../core/runner.js';
import type { ProjectScanResult } from '../../models/context-pack.js';

export type ScanPhase = 'scanning' | 'done' | 'error';

export interface ScanState {
  phase: ScanPhase;
  messages: string[];
  result: ProjectScanResult | null;
  error: string | null;
}

export function useScan(projectPath: string, includeSecrets: boolean): ScanState {
  const [state, setState] = useState<ScanState>({
    phase: 'scanning',
    messages: [],
    result: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const messages: string[] = [];

    runScan(projectPath, {
      secrets: includeSecrets,
      onProgress: msg => {
        if (cancelled) return;
        messages.push(msg);
        setState(s => ({ ...s, messages: [...messages] }));
      },
    })
      .then(result => {
        if (cancelled) return;
        setState({ phase: 'done', messages, result, error: null });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState(s => ({ ...s, phase: 'error', error: err.message }));
      });

    return () => { cancelled = true; };
  }, [projectPath, includeSecrets]);

  return state;
}
