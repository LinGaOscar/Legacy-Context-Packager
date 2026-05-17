import React, { useState } from 'react';
import { Box, Text } from 'ink';
import path from 'path';
import { useScan } from './hooks/useScan.js';
import { InputScreen } from './screens/InputScreen.js';
import { ScanScreen } from './screens/ScanScreen.js';
import { ResultScreen } from './screens/ResultScreen.js';

interface Props {
  projectPath?: string;
  secrets: boolean;
}

export function App({ projectPath: initialPath, secrets }: Props) {
  const [confirmedPath, setConfirmedPath] = useState<string | null>(
    initialPath ? path.resolve(initialPath) : null
  );
  const scan = useScan(confirmedPath, secrets);

  if (!confirmedPath) {
    return <InputScreen onConfirm={p => setConfirmedPath(path.resolve(p))} />;
  }

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
