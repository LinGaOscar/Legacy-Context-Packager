import React from 'react';
import { Box, Text } from 'ink';

const VISIBLE = 15;

export interface Column<T> {
  header: string;
  width: number;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  selectedIdx: number;
  offset: number;
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

export function cell(s: string, width: number) {
  return truncate(String(s ?? ''), width).padEnd(width);
}

export function ScrollTable<T>({ columns, rows, selectedIdx, offset }: Props<T>) {
  const visible = rows.slice(offset, offset + VISIBLE);
  const totalW = columns.reduce((s, c) => s + c.width + 1, 0);
  const divider = '─'.repeat(totalW);

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        {columns.map(col => (
          <Text key={col.header} bold color="gray"> {cell(col.header, col.width)}</Text>
        ))}
      </Box>
      <Text color="gray">{divider}</Text>
      {rows.length === 0 && (
        <Text color="gray">  （無資料）</Text>
      )}
      {visible.map((row, i) => {
        const absIdx = offset + i;
        const isSelected = absIdx === selectedIdx;
        return (
          <Box key={`row-${absIdx}`} flexDirection="row" backgroundColor={isSelected ? 'blueBright' : undefined}>
            <Text color={isSelected ? 'black' : undefined}>{isSelected ? '▶' : ' '}</Text>
            {columns.map(col => (
              <Box key={`${absIdx}-${col.header}`} width={col.width + 1}>
                <Text color={isSelected ? 'black' : undefined}>{col.render(row)}</Text>
              </Box>
            ))}
          </Box>
        );
      })}
      {rows.length > VISIBLE && (
        <Text color="gray">  …{rows.length - VISIBLE - offset > 0 ? `還有 ${rows.length - offset - VISIBLE} 筆` : ''}</Text>
      )}
    </Box>
  );
}
