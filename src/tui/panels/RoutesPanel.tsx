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
      <Box paddingBottom={1}>
        <Text color="gray">靜態掃描出的 API 路由清單，含 HTTP method、路徑與對應的 Controller 方法。可貼給 LLM 分析 API 結構或產生測試案例。</Text>
      </Box>
      <ScrollTable columns={COLS} rows={routes} selectedIdx={table.selectedIdx} offset={table.offset} />
      {table.detailOpen && table.selected && (
        <DetailOverlay item={table.selected} />
      )}
    </Box>
  );
}
