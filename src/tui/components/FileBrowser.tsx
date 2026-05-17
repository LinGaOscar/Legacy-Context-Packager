import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import fs from 'fs';
import path from 'path';

export type BrowseMode = 'directory' | 'file';

const VALID_EXTS = new Set(['.war', '.java', '.cs', '.php']);
const VISIBLE = 14;

interface Entry {
  name: string;
  isDir: boolean;
  isConfirm: boolean;
  fullPath: string;
}

function readEntries(dirPath: string, mode: BrowseMode): Entry[] {
  const confirm: Entry[] = mode === 'directory'
    ? [{ name: '[ 選擇此目錄 ]', isDir: false, isConfirm: true, fullPath: dirPath }]
    : [];

  let items: Entry[] = [];
  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const d of dirents) {
      if (d.name.startsWith('.')) continue;
      const full = path.join(dirPath, d.name);
      if (d.isDirectory()) {
        items.push({ name: d.name + '/', isDir: true, isConfirm: false, fullPath: full });
      } else if (mode === 'file') {
        const ext = path.extname(d.name).toLowerCase();
        if (VALID_EXTS.has(ext)) {
          items.push({ name: d.name, isDir: false, isConfirm: false, fullPath: full });
        }
      }
    }
  } catch { /* permission denied */ }

  items = items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return [...confirm, ...items];
}

interface Props {
  mode: BrowseMode;
  startDir: string;
  onConfirm: (p: string) => void;
  onCancel: () => void;
}

export function FileBrowser({ mode, startDir, onConfirm, onCancel }: Props) {
  const [currentDir, setCurrentDir] = useState(startDir);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [offset, setOffset] = useState(0);

  const entries = useMemo(() => readEntries(currentDir, mode), [currentDir, mode]);

  useInput((input: string, key: Key) => {
    if (key.escape) { onCancel(); return; }

    if (key.upArrow || input === 'k') {
      const next = Math.max(0, selectedIdx - 1);
      setSelectedIdx(next);
      if (next < offset) setOffset(next);
    }
    if (key.downArrow || input === 'j') {
      const next = Math.min(entries.length - 1, selectedIdx + 1);
      setSelectedIdx(next);
      if (next >= offset + VISIBLE) setOffset(next - VISIBLE + 1);
    }

    if (key.return) {
      const entry = entries[selectedIdx];
      if (!entry) return;
      if (entry.isConfirm) { onConfirm(entry.fullPath); return; }
      if (entry.isDir) {
        setCurrentDir(entry.fullPath);
        setSelectedIdx(0);
        setOffset(0);
      } else {
        onConfirm(entry.fullPath);
      }
    }

    if (key.backspace) {
      const parent = path.dirname(currentDir);
      if (parent !== currentDir) {
        setCurrentDir(parent);
        setSelectedIdx(0);
        setOffset(0);
      }
    }
  });

  const visible = entries.slice(offset, offset + VISIBLE);
  const hasMore = offset + VISIBLE < entries.length;

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold color="gray">目前位置</Text>
        <Text color="cyan">{currentDir}</Text>
      </Box>

      <Box flexDirection="column">
        {visible.length === 0 && <Text color="gray">  （無可選項目）</Text>}
        {visible.map((entry, i) => {
          const absIdx = offset + i;
          const isSelected = absIdx === selectedIdx;
          const color = entry.isConfirm ? 'green' : entry.isDir ? 'blueBright' : 'white';
          return (
            <Box key={entry.fullPath + i} backgroundColor={isSelected ? 'blueBright' : undefined}>
              <Text color={isSelected ? 'black' : color}>
                {isSelected ? '▶ ' : '  '}{entry.name}
              </Text>
            </Box>
          );
        })}
        {hasMore && <Text color="gray">  ↓ 還有 {entries.length - offset - VISIBLE} 項</Text>}
      </Box>

      <Text color="gray" dimColor>
        ↑↓ 移動　Enter 進入/選擇　Backspace 上層　Esc 返回
      </Text>
    </Box>
  );
}
