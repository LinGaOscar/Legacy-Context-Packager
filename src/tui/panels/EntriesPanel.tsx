import React from 'react';
import { Box, Text } from 'ink';
import { ScrollTable, cell } from '../components/ScrollTable.js';
import { DetailOverlay } from '../components/DetailOverlay.js';
import { useScrollTable } from '../hooks/useScrollTable.js';
import type { WebEntry } from '../../models/entry.js';
import path from 'path';

const COLS = [
  { header: 'TYPE',   width: 12, render: (e: WebEntry) => <Text color="cyan">{cell(e.entryType, 12)}</Text> },
  { header: 'SOURCE', width: 24, render: (e: WebEntry) => <Text>{cell(`${path.basename(e.sourceFile)}:${e.lineNumber}`, 24)}</Text> },
  { header: 'TARGET', width: 36, render: (e: WebEntry) => <Text color="green">{cell(e.targetPath, 36)}</Text> },
  { header: 'INVOKE', width: 10, render: (e: WebEntry) => <Text color="gray">{cell(e.invokeType, 10)}</Text> },
];

interface Props { entries: WebEntry[]; active: boolean; }

export function EntriesPanel({ entries, active }: Props) {
  const table = useScrollTable(entries, active);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <ScrollTable columns={COLS} rows={entries} selectedIdx={table.selectedIdx} offset={table.offset} />
      {table.detailOpen && table.selected && (
        <DetailOverlay item={table.selected} />
      )}
    </Box>
  );
}
