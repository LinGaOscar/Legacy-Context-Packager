import React from 'react';
import { Box, Text } from 'ink';
import type { DependencyMap } from '../../models/dependency.js';

interface Props { depMap: DependencyMap; }

export function DepsPanel({ depMap }: Props) {
  const fileEdges = depMap.edges.filter(e => e.relationType === 'file-to-file').slice(0, 30);

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={4}>
        <StatCard value={depMap.nodes.length}      label="Nodes" />
        <StatCard value={depMap.edges.length}      label="Dep Edges" />
        <StatCard value={depMap.configFiles.length} label="Config Files" />
      </Box>

      {depMap.configFiles.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="gray">CONFIG FILES</Text>
          {depMap.configFiles.map(f => <Text key={f} color="cyan">  {f}</Text>)}
        </Box>
      )}

      {fileEdges.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="gray">INTERNAL IMPORTS (top 30)</Text>
          {fileEdges.map((e, i) => (
            <Text key={i} color="gray">  {e.from} <Text color="blueBright">→</Text> {e.to}</Text>
          ))}
        </Box>
      )}

      {depMap.nodes.length === 0 && depMap.configFiles.length === 0 && (
        <Text color="gray">  （無相依資料）</Text>
      )}
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
