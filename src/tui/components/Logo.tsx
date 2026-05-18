import React from 'react';
import { Box, Text } from 'ink';
import { createRequire } from 'module';
const { version } = createRequire(import.meta.url)('../../../package.json') as { version: string };

export function Logo() {
  return (
    <Box flexDirection="row" alignItems="flex-start" gap={2}>
      {/* LCP badge：三個字母在同一個大框內 */}
      <Box borderStyle="round" borderColor="blueBright" paddingX={1} flexDirection="row" gap={1}>
        <Text bold color="blueBright">L</Text>
        <Text bold color="cyan">C</Text>
        <Text bold color="green">P</Text>
      </Box>

      <Box flexDirection="column">
        <Text color="white">Legacy Context Packager</Text>
        <Text color="gray" dimColor>企業遺留系統靜態分析 → LLM 上下文包</Text>
        <Text color="gray" dimColor>v{version}</Text>
      </Box>
    </Box>
  );
}
