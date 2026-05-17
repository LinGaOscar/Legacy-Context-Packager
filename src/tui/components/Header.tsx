import React from 'react';
import { Box, Text } from 'ink';
import type { ProjectScanResult } from '../../models/context-pack.js';

interface Props {
  result: ProjectScanResult;
}

export function Header({ result }: Props) {
  const { projectInfo: p } = result;
  const name = p.rootPath.split('/').pop() ?? p.rootPath;
  const critCount = result.secrets.filter(s => s.severity === 'critical').length;

  return (
    <Box borderStyle="single" borderColor="blueBright" paddingX={1} flexDirection="row" gap={2} flexWrap="wrap">
      <Text bold color="blueBright">Legacy Context Packager</Text>
      <Text bold>{name}</Text>
      <Text color="cyan">[{p.language}]</Text>
      <Text color="green">[{p.framework}]</Text>
      <Text color="gray">{p.totalFiles} files · {p.scanDurationMs}ms</Text>
      {critCount > 0 && <Text color="red" bold>⚠ {critCount} critical secrets</Text>}
    </Box>
  );
}
