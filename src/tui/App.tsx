import React from 'react';
import { Box, Text, useApp } from 'ink';
import { useScan } from './hooks/useScan.js';
import { ScanScreen } from './screens/ScanScreen.js';
import { ResultScreen } from './screens/ResultScreen.js';

interface Props {
  projectPath: string;
  secrets: boolean;
}

export function App({ projectPath, secrets }: Props) {
  const { exit } = useApp();
  const scan = useScan(projectPath, secrets);

  if (scan.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">掃描失敗</Text>
        <Text color="red">{scan.error}</Text>
      </Box>
    );
  }

  if (scan.phase === 'scanning' || !scan.result) {
    return <ScanScreen messages={scan.messages} error={scan.error} />;
  }

  return <ResultScreen result={scan.result} />;
}
