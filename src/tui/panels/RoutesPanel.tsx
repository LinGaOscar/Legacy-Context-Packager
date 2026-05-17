import React from 'react';
import { Box, Text } from 'ink';
import { ScrollTable, cell } from '../components/ScrollTable.js';
import { DetailOverlay } from '../components/DetailOverlay.js';
import { useScrollTable } from '../hooks/useScrollTable.js';
import type { Route } from '../../models/route.js';

const COLS = [
  { header: 'METHOD', width: 8,  render: (r: Route) => <Text color={methodColor(r.httpMethod)}>{cell(r.httpMethod, 8)}</Text> },
  { header: 'PATH',   width: 40, render: (r: Route) => <Text>{cell(r.path, 40)}</Text> },
  { header: 'HANDLER',width: 30, render: (r: Route) => <Text color="cyan">{cell(r.className ? `${r.className}#${r.methodName ?? ''}` : '-', 30)}</Text> },
  { header: 'CONF',   width: 6,  render: (r: Route) => <Text color={confColor(r.confidence)}>{cell(r.confidence, 6)}</Text> },
];

function methodColor(m: string) {
  const map: Record<string, string> = { GET: 'green', POST: 'blue', PUT: 'yellow', DELETE: 'red', PATCH: 'magenta' };
  return map[m] ?? 'gray';
}

function confColor(c: string) {
  return c === 'high' ? 'green' : c === 'medium' ? 'yellow' : 'red';
}

interface Props { routes: Route[]; active: boolean; onExport: (rows: Route[]) => void; }

export function RoutesPanel({ routes, active, onExport }: Props) {
  const table = useScrollTable(routes, active);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <ScrollTable columns={COLS} rows={routes} selectedIdx={table.selectedIdx} offset={table.offset} />
      {table.detailOpen && table.selected && (
        <DetailOverlay item={table.selected} />
      )}
    </Box>
  );
}
