import React from 'react';
import { Box, Text } from 'ink';

export const TABS = ['Routes', 'Secrets', 'Entries', 'Dependencies', 'Export'] as const;
export type TabName = typeof TABS[number];

interface Props {
  active: TabName;
  counts: Record<TabName, number | null>;
}

export function TabBar({ active, counts }: Props) {
  return (
    <Box flexDirection="row">
      {TABS.map((tab, i) => {
        const isActive = tab === active;
        const count = counts[tab];
        const label = count !== null ? `${tab} (${count})` : tab;
        return (
          <Box key={tab} paddingX={2} paddingY={0}
            borderStyle={isActive ? 'bold' : undefined}
            borderBottom={isActive}
            borderColor={isActive ? 'blueBright' : undefined}
          >
            <Text bold={isActive} color={isActive ? 'blueBright' : 'gray'}>
              {i > 0 ? '│ ' : ''}{label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
