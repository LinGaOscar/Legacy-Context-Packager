import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  onConfirm: (path: string) => void;
}

export function InputScreen({ onConfirm }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useInput((input, key) => {
    if (key.return) {
      const trimmed = value.trim();
      if (!trimmed) {
        setError('路徑不可為空');
        return;
      }
      onConfirm(trimmed);
    } else if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1));
      setError('');
    } else if (!key.ctrl && !key.meta && input) {
      setValue(v => v + input);
      setError('');
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blueBright">Legacy Context Packager</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>請輸入要掃描的專案路徑：</Text>
        <Box marginTop={1}>
          <Text color="green">› </Text>
          <Text>{value}</Text>
          <Text color="green" bold>█</Text>
        </Box>
        {error
          ? <Text color="red">{error}</Text>
          : <Text dimColor>按 Enter 確認</Text>
        }
      </Box>
    </Box>
  );
}
