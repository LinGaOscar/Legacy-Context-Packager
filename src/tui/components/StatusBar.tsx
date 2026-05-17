import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  detailOpen?: boolean;
}

export function StatusBar({ detailOpen }: Props) {
  if (detailOpen) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">[Esc] 關閉</Text>
      </Box>
    );
  }
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} gap={3}>
      <Text color="gray">↑↓/jk 移動</Text>
      <Text color="gray">Tab 切頁</Text>
      <Text color="gray">Enter 查看詳情</Text>
      <Text color="gray">e 匯出 MD</Text>
      <Text color="gray">q 離開</Text>
    </Box>
  );
}
