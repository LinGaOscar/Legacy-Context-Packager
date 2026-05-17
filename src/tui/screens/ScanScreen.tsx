import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface Props {
  messages: string[];
  error: string | null;
}

export function ScanScreen({ messages, error }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blueBright">Legacy Context Packager</Text>
      <Box marginTop={1} flexDirection="column">
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="row" gap={1}>
            {i === messages.length - 1 && !error
              ? <Text color="green"><Spinner type="dots" /></Text>
              : <Text color="green">✓</Text>
            }
            <Text>{msg}</Text>
          </Box>
        ))}
        {messages.length === 0 && !error && (
          <Box flexDirection="row" gap={1}>
            <Text color="green"><Spinner type="dots" /></Text>
            <Text>初始化中...</Text>
          </Box>
        )}
        {error && <Text color="red">✗ {error}</Text>}
      </Box>
    </Box>
  );
}
