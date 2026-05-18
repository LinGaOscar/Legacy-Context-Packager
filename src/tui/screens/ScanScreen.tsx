import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Logo } from '../components/Logo.js';

const BAR_LEN = 20;
const BLOCK = 7;
const FRAMES = Array.from({ length: BAR_LEN }, (_, i) => i);

function buildBar(frame: number): string {
  return FRAMES.map(i => {
    const pos = frame % BAR_LEN;
    const dist = Math.min(Math.abs(i - pos), BAR_LEN - Math.abs(i - pos));
    return dist < BLOCK ? '█' : '░';
  }).join('');
}

interface Props {
  messages: string[];
  error: string | null;
}

export function ScanScreen({ messages, error }: Props) {
  const [frame, setFrame] = useState(0);
  const isLarge = messages.length >= 3;

  useEffect(() => {
    if (error) return;
    const id = setInterval(() => setFrame(f => f + 1), 100);
    return () => clearInterval(id);
  }, [error]);

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Logo />

      <Box flexDirection="column">
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

      {!error && (
        <Box flexDirection="column" gap={0}>
          <Text color="blueBright" dimColor>{buildBar(frame)}</Text>
          {isLarge && (
            <Text color="gray" dimColor>掃描中，大型專案需要較長時間...</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
