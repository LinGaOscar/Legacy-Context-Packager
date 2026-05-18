import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  detailOpen?: boolean;
  savedPath?: string | null;
}

export function StatusBar({ detailOpen, savedPath }: Props) {
  if (detailOpen) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">Esc 返回列表</Text>
      </Box>
    );
  }
  if (savedPath) {
    return (
      <Box borderStyle="single" borderColor="green" paddingX={1} gap={2}>
        <Text color="green">✓ 已輸出至 {savedPath}</Text>
        <Text color="gray">q 離開</Text>
      </Box>
    );
  }
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} gap={3}>
      <Text color="gray">↑↓/jk 移動</Text>
      <Text color="gray">Tab 切頁</Text>
      <Text color="gray">Enter 詳情</Text>
      <Text color="gray">s 儲存輸出</Text>
      <Text color="gray">e 匯出 MD</Text>
      <Text color="gray">q 離開</Text>
    </Box>
  );
}
