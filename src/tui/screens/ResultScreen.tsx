import React, { useState } from 'react';
import { Box, useInput, useApp, type Key } from 'ink';
import { Header } from '../components/Header.js';
import { TabBar, TABS, type TabName } from '../components/TabBar.js';
import { StatusBar } from '../components/StatusBar.js';
import { Logo } from '../components/Logo.js';
import { RoutesPanel } from '../panels/RoutesPanel.js';
import { SecretsPanel } from '../panels/SecretsPanel.js';
import { EntriesPanel } from '../panels/EntriesPanel.js';
import { DepsPanel } from '../panels/DepsPanel.js';
import { ExportPanel } from '../panels/ExportPanel.js';
import type { ProjectScanResult } from '../../models/context-pack.js';

interface Props { result: ProjectScanResult; }

export function ResultScreen({ result }: Props) {
  const { exit } = useApp();
  const [tabIdx, setTabIdx] = useState(0);

  const activeTab = TABS[tabIdx];

  useInput((input: string, key: Key) => {
    if (input === 'q') { exit(); return; }
    if (key.tab) setTabIdx(i => (i + 1) % TABS.length);
  });

  const counts: Record<TabName, number | null> = {
    Routes: result.routes.length,
    Secrets: result.secrets.length,
    Entries: result.webEntries.length,
    Dependencies: null,
    Export: null,
  };

  return (
    <Box flexDirection="column">
      <Logo />
      <Header result={result} />
      <TabBar active={activeTab} counts={counts} />
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={0}>
        {activeTab === 'Routes'       && <RoutesPanel  routes={result.routes}       active={true} onExport={() => {}} />}
        {activeTab === 'Secrets'      && <SecretsPanel secrets={result.secrets}      active={true} />}
        {activeTab === 'Entries'      && <EntriesPanel entries={result.webEntries}   active={true} />}
        {activeTab === 'Dependencies' && <DepsPanel    depMap={result.dependencyMap} active={true} />}
        {activeTab === 'Export'       && <ExportPanel  result={result}               active={true} />}
      </Box>
      <StatusBar />
    </Box>
  );
}
