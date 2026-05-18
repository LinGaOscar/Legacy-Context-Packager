import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { DependencyMap } from '../../models/dependency.js';

const VISIBLE = 12;

interface Props {
  depMap: DependencyMap;
  active: boolean;
}

type ListItem =
  | { kind: 'header'; text: string; sub: string }
  | { kind: 'config'; path: string }
  | { kind: 'edge'; from: string; to: string }
  | { kind: 'empty' };

function buildItems(depMap: DependencyMap): ListItem[] {
  const items: ListItem[] = [];

  if (depMap.configFiles.length > 0) {
    items.push({ kind: 'header', text: '設定檔清單', sub: `共 ${depMap.configFiles.length} 個` });
    for (const f of depMap.configFiles) items.push({ kind: 'config', path: f });
  }

  const fileEdges = depMap.edges.filter(e => e.relationType === 'file-to-file');
  if (fileEdges.length > 0) {
    items.push({ kind: 'header', text: '檔案引用關係', sub: `共 ${fileEdges.length} 筆` });
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
      <Text color="gray">掃描出的設定檔與檔案間的引用關係，協助快速掌握專案結構。</Text>

      {/* 統計卡片 */}
      <Box flexDirection="row" gap={4}>
        <StatCard value={depMap.nodes.length}       label="分析檔案" hint="掃描到的原始碼檔案數" />
        <StatCard value={depMap.edges.length}       label="引用關係" hint="檔案間 import 總數" />
        <StatCard value={depMap.configFiles.length} label="設定檔"   hint="config / properties 等" />
      </Box>

      {/* 清單 */}
      <Box flexDirection="column">
        {visible.map((item, i) => {
          if (item.kind === 'header') {
            return (
              <Box key={i} flexDirection="row" gap={1} marginTop={i === 0 ? 0 : 1}>
                <Text bold color="white">{item.text}</Text>
                <Text color="gray">({item.sub})</Text>
              </Box>
            );
          }
          if (item.kind === 'config') {
            return <Text key={i} color="cyan">  {item.path}</Text>;
          }
          if (item.kind === 'edge') {
            return (
              <Box key={i} flexDirection="row" gap={1}>
                <Text color="gray">  </Text>
                <Text color="white">{item.from}</Text>
                <Text color="blueBright">→</Text>
                <Text color="gray">{item.to}</Text>
              </Box>
            );
          }
          return <Text key={i} color="gray">  （尚無相依資料）</Text>;
        })}
        {hasMore && <Text color="white">  ↓ 還有 {total - offset - VISIBLE} 筆（↑↓ 捲動）</Text>}
        {offset > 0 && <Text color="white">  ↑ 已略過 {offset} 筆</Text>}
      </Box>
    </Box>
  );
}

function StatCard({ value, label, hint }: { value: number; label: string; hint: string }) {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexDirection="column" minWidth={16}>
      <Text bold color="blueBright">{value}</Text>
      <Text color="white">{label}</Text>
      <Text color="gray" dimColor>{hint}</Text>
    </Box>
  );
}
