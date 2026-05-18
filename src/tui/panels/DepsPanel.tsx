import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { DependencyMap } from '../../models/dependency.js';

const VISIBLE = 12;

interface Props {
  depMap: DependencyMap;
  active: boolean;
}

type ListItem =
  | { kind: 'header'; text: string }
  | { kind: 'config'; path: string }
  | { kind: 'edge'; from: string; to: string }
  | { kind: 'empty' };

function buildItems(depMap: DependencyMap): ListItem[] {
  const items: ListItem[] = [];

  if (depMap.configFiles.length > 0) {
    items.push({ kind: 'header', text: `CONFIG FILES (${depMap.configFiles.length})` });
    for (const f of depMap.configFiles) items.push({ kind: 'config', path: f });
  }

  const fileEdges = depMap.edges.filter(e => e.relationType === 'file-to-file');
  if (fileEdges.length > 0) {
    items.push({ kind: 'header', text: `INTERNAL IMPORTS (${fileEdges.length})` });
    for (const e of fileEdges) items.push({ kind: 'edge', from: e.from, to: e.to });
  }

  if (items.length === 0) items.push({ kind: 'empty' });

  return items;
}

export function DepsPanel({ depMap, active }: Props) {
  const [offset, setOffset] = useState(0);
  const items = buildItems(depMap);
  const total = items.length;

  useInput((_input: string, key: Key) => {
    if (!active) return;
    if (key.downArrow) setOffset(o => Math.min(o + 1, Math.max(0, total - VISIBLE)));
    if (key.upArrow)   setOffset(o => Math.max(0, o - 1));
  }, { isActive: active });

  const visible = items.slice(offset, offset + VISIBLE);
  const hasMore = offset + VISIBLE < total;

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text color="gray" dimColor>模組與檔案的依賴關係摘要，以及偵測到的設定檔清單。可用於快速了解專案結構與 config 分佈。</Text>
      </Box>
      <Box flexDirection="row" gap={4}>
        <StatCard value={depMap.nodes.length}       label="Nodes" />
        <StatCard value={depMap.edges.length}       label="Dep Edges" />
        <StatCard value={depMap.configFiles.length} label="Config Files" />
      </Box>

      <Box flexDirection="column">
        {visible.map((item, i) => {
          if (item.kind === 'header') return <Text key={i} bold color="gray">{item.text}</Text>;
          if (item.kind === 'config') return <Text key={i} color="cyan">  {item.path}</Text>;
          if (item.kind === 'edge')   return <Text key={i} color="gray">  {item.from} <Text color="blueBright">→</Text> {item.to}</Text>;
          return <Text key={i} color="gray">  （無相依資料）</Text>;
        })}
        {hasMore && (
          <Text color="gray">  ↓ 還有 {total - offset - VISIBLE} 筆（↑↓ 捲動）</Text>
        )}
        {offset > 0 && (
          <Text color="gray">  ↑ 已略過 {offset} 筆</Text>
        )}
      </Box>
    </Box>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Box borderStyle="single" borderColor="gray" padding={1} flexDirection="column" minWidth={14}>
      <Text bold color="blueBright">{value}</Text>
      <Text color="gray">{label}</Text>
    </Box>
  );
}
