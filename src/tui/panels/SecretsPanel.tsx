import React from 'react';
import { Box, Text } from 'ink';
import { ScrollTable, cell } from '../components/ScrollTable.js';
import { DetailOverlay } from '../components/DetailOverlay.js';
import { useScrollTable } from '../hooks/useScrollTable.js';
import type { Secret } from '../../models/secret.js';
import path from 'path';

const sevColor = (s: string) =>
  ({ critical: 'red', high: 'redBright', medium: 'yellow', low: 'green' }[s] ?? 'gray');

const COLS = [
  { header: 'SEV',    width: 8,  render: (s: Secret) => <Text color={sevColor(s.severity)}>{cell(s.severity, 8)}</Text> },
  { header: 'TYPE',   width: 22, render: (s: Secret) => <Text>{cell(s.secretType, 22)}</Text> },
  { header: 'FILE',   width: 22, render: (s: Secret) => <Text color="cyan">{cell(path.basename(s.filePath), 22)}</Text> },
  { header: 'LINE',   width: 5,  render: (s: Secret) => <Text>{cell(String(s.lineNumber), 5)}</Text> },
  { header: 'MASKED', width: 24, render: (s: Secret) => <Text color="gray">{cell(s.maskedValue, 24)}</Text> },
];

interface Props { secrets: Secret[]; active: boolean; }

export function SecretsPanel({ secrets, active }: Props) {
  const table = useScrollTable(secrets, active);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <ScrollTable columns={COLS} rows={secrets} selectedIdx={table.selectedIdx} offset={table.offset} />
      {table.detailOpen && table.selected && (
        <DetailOverlay item={table.selected} />
      )}
    </Box>
  );
}
