import React from 'react';
import { Box, Text } from 'ink';

export function StatusBar() {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} gap={3}>
      <Text color="white">↑↓/jk 移動</Text>
      <Text color="white">Tab 切頁</Text>
      <Text color="white">Enter 詳情</Text>
      <Text color="white">q 離開</Text>
    </Box>
  );
}
