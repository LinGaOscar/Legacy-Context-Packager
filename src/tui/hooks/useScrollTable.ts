import { useState, useCallback } from 'react';
import { useInput, type Key } from 'ink';

const VISIBLE_ROWS = 15;

export interface ScrollTableState<T> {
  selectedIdx: number;
  offset: number;
  selected: T | null;
  detailOpen: boolean;
}

export function useScrollTable<T>(
  rows: T[],
  active: boolean,
): ScrollTableState<T> & {
  openDetail: () => void;
  closeDetail: () => void;
} {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const move = useCallback((delta: number) => {
    setSelectedIdx(prev => {
      const next = Math.max(0, Math.min(rows.length - 1, prev + delta));
      setOffset(off => {
        if (next < off) return next;
        if (next >= off + VISIBLE_ROWS) return next - VISIBLE_ROWS + 1;
        return off;
      });
      return next;
    });
  }, [rows.length]);

  useInput((input: string, key: Key) => {
    if (!active || detailOpen) return;
    if (key.downArrow || input === 'j') move(1);
    if (key.upArrow   || input === 'k') move(-1);
    if (key.return) setDetailOpen(true);
  }, { isActive: active });

  useInput((_input: string, key: Key) => {
    if (!active || !detailOpen) return;
    if (key.escape) setDetailOpen(false);
  }, { isActive: active && detailOpen });

  return {
    selectedIdx,
    offset,
    selected: rows[selectedIdx] ?? null,
    detailOpen,
    openDetail: () => setDetailOpen(true),
    closeDetail: () => setDetailOpen(false),
  };
}
