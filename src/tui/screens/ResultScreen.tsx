import React, { useState } from 'react';
import { Box, Text, useInput, useApp, type Key } from 'ink';
import fs from 'fs';
import path from 'path';
import { Header } from '../components/Header.js';
import { TabBar, TABS, type TabName } from '../components/TabBar.js';
import { StatusBar } from '../components/StatusBar.js';
import { buildOutput } from '../../core/output-builder.js';
import { RoutesPanel } from '../panels/RoutesPanel.js';
import { SecretsPanel } from '../panels/SecretsPanel.js';
import { EntriesPanel } from '../panels/EntriesPanel.js';
import { DepsPanel } from '../panels/DepsPanel.js';
import type { ProjectScanResult } from '../../models/context-pack.js';

interface Props { result: ProjectScanResult; }

export function ResultScreen({ result }: Props) {
  const { exit } = useApp();
  const [tabIdx, setTabIdx] = useState(0);
  const [exported, setExported] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const activeTab = TABS[tabIdx];

  useInput((input: string, key: Key) => {
    if (input === 'q') { exit(); return; }
    if (key.tab) {
      setTabIdx(i => (i + 1) % TABS.length);
      setExported(null);
    }
    if (input === 'e') {
      const outPath = exportMarkdown(result, activeTab);
      setExported(outPath);
    }
    if (input === 's' && !savedPath) {
      const outDir = path.resolve('./lcp-output');
      buildOutput(result, { outputDir: outDir, formats: ['json', 'markdown'], report: true });
      setSavedPath(outDir);
    }
  });

  const counts: Record<TabName, number | null> = {
    Routes: result.routes.length,
    Secrets: result.secrets.length,
    Entries: result.webEntries.length,
    Dependencies: null,
  };

  return (
    <Box flexDirection="column">
      <Header result={result} />
      <TabBar active={activeTab} counts={counts} />
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={0}>
        {activeTab === 'Routes'       && <RoutesPanel  routes={result.routes}         active={true} onExport={() => {}} />}
        {activeTab === 'Secrets'      && <SecretsPanel secrets={result.secrets}        active={true} />}
        {activeTab === 'Entries'      && <EntriesPanel entries={result.webEntries}     active={true} />}
        {activeTab === 'Dependencies' && <DepsPanel    depMap={result.dependencyMap} active={true} />}
      </Box>
      {exported && (
        <Box paddingX={1}>
          <Text color="green">✓ 已匯出：{exported}</Text>
        </Box>
      )}
      <StatusBar savedPath={savedPath} />
    </Box>
  );
}

function exportMarkdown(result: ProjectScanResult, tab: TabName): string {
  const lines: string[] = [`# LCP — ${path.basename(result.projectInfo.rootPath)} · ${tab}`, ''];

  if (tab === 'Routes') {
    lines.push('| Method | Path | Handler | Confidence |');
    lines.push('|--------|------|---------|------------|');
    for (const r of result.routes) {
      const h = r.className ? `${r.className}#${r.methodName ?? ''}` : '-';
      lines.push(`| ${r.httpMethod} | \`${r.path}\` | ${h} | ${r.confidence} |`);
    }
  } else if (tab === 'Secrets') {
    lines.push('| Severity | Type | File | Line | Masked |');
    lines.push('|----------|------|------|------|--------|');
    for (const s of result.secrets) {
      lines.push(`| ${s.severity} | ${s.secretType} | ${path.basename(s.filePath)} | ${s.lineNumber} | \`${s.maskedValue}\` |`);
    }
  } else if (tab === 'Entries') {
    lines.push('| Type | Source | Target | Invoke |');
    lines.push('|------|--------|--------|--------|');
    for (const e of result.webEntries) {
      lines.push(`| ${e.entryType} | ${path.basename(e.sourceFile)}:${e.lineNumber} | \`${e.targetPath}\` | ${e.invokeType} |`);
    }
  } else {
    lines.push(`**Nodes:** ${result.dependencyMap.nodes.length}  `);
    lines.push(`**Edges:** ${result.dependencyMap.edges.length}  `);
    lines.push('');
    lines.push('**Config Files:**');
    for (const f of result.dependencyMap.configFiles) lines.push(`- ${f}`);
  }

  const outPath = path.resolve(`lcp-export-${tab.toLowerCase()}.md`);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}
