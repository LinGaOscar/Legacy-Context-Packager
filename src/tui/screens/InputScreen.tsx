import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import path from 'path';
import { FileBrowser, type BrowseMode } from '../components/FileBrowser.js';
import { Logo } from '../components/Logo.js';

type ScanMode   = 'directory' | 'file';
type InputMethod = 'browse' | 'type';
type Phase = 'mode-select' | 'method-select' | 'browse' | 'type';

interface Props {
  onConfirm: (path: string) => void;
}

function RadioList({ items, selectedIdx }: { items: string[]; selectedIdx: number }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={item} color={i === selectedIdx ? 'blueBright' : 'white'}>
          {i === selectedIdx ? '▶ ' : '  '}{item}
        </Text>
      ))}
    </Box>
  );
}

export function InputScreen({ onConfirm }: Props) {
  const [phase, setPhase]         = useState<Phase>('mode-select');
  const [scanMode, setScanMode]   = useState<ScanMode>('directory');
  const [inputMethod, setMethod]  = useState<InputMethod>('browse');
  const [radioIdx, setRadioIdx]   = useState(0);
  const [typedPath, setTypedPath] = useState('');
  const [typeError, setTypeError] = useState('');

  // ── mode-select & method-select 共用的 radio 操作 ─────────────────────────
  useInput((input: string, key: Key) => {
    if (phase === 'browse' || phase === 'type') return;

    const maxIdx = 1;
    if (key.upArrow)   setRadioIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setRadioIdx(i => Math.min(maxIdx, i + 1));

    if (key.return) {
      if (phase === 'mode-select') {
        setScanMode(radioIdx === 0 ? 'directory' : 'file');
        setRadioIdx(0);
        setPhase('method-select');
      } else if (phase === 'method-select') {
        const method: InputMethod = radioIdx === 0 ? 'browse' : 'type';
        setMethod(method);
        setRadioIdx(0);
        setPhase(method);
      }
    }

    if (key.escape && phase === 'method-select') {
      setRadioIdx(0);
      setPhase('mode-select');
    }
  });

  // ── 直接輸入路徑 ──────────────────────────────────────────────────────────
  useInput((input: string, key: Key) => {
    if (phase !== 'type') return;
    if (key.escape)  { setPhase('method-select'); setTypedPath(''); setTypeError(''); return; }
    if (key.return) {
      const trimmed = typedPath.trim();
      if (!trimmed) { setTypeError('路徑不可為空'); return; }
      onConfirm(path.resolve(trimmed));
      return;
    }
    if (key.backspace) { setTypedPath(v => v.slice(0, -1)); setTypeError(''); return; }
    if (!key.ctrl && !key.meta && input) { setTypedPath(v => v + input); setTypeError(''); }
  });

  const browseMode: BrowseMode = scanMode === 'file' ? 'file' : 'directory';

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Logo />

      {/* ── Step 1: 選目標類型 ── */}
      {phase === 'mode-select' && (
        <Box flexDirection="column" gap={1}>
          <Text bold>選擇掃描目標類型</Text>
          <RadioList
            items={['專案目錄（Java / C# / PHP / WAR 解壓目錄）', '單一檔案（.war / .java / .cs / .php）']}
            selectedIdx={radioIdx}
          />
          <Text color="gray">↑↓ 移動　Enter 確認</Text>
        </Box>
      )}

      {/* ── Step 2: 選輸入方式 ── */}
      {phase === 'method-select' && (
        <Box flexDirection="column" gap={1}>
          <Text color="gray">目標：<Text color="white">{scanMode === 'directory' ? '專案目錄' : '單一檔案'}</Text></Text>
          <Text bold>選擇輸入方式</Text>
          <RadioList
            items={['瀏覽並選擇', '直接輸入絕對路徑']}
            selectedIdx={radioIdx}
          />
          <Text color="gray">↑↓ 移動　Enter 確認　Esc 返回</Text>
        </Box>
      )}

      {/* ── Step 3a: 瀏覽 ── */}
      {phase === 'browse' && (
        <FileBrowser
          mode={browseMode}
          startDir={process.cwd()}
          onConfirm={p => onConfirm(p)}
          onCancel={() => { setRadioIdx(0); setPhase('method-select'); }}
        />
      )}

      {/* ── Step 3b: 直接輸入 ── */}
      {phase === 'type' && (
        <Box flexDirection="column" gap={1}>
          <Text color="gray">目標：<Text color="white">{scanMode === 'directory' ? '專案目錄' : '單一檔案'}</Text></Text>
          <Text bold>輸入絕對路徑</Text>
          <Box>
            <Text color="green">› </Text>
            <Text>{typedPath}</Text>
            <Text color="green" bold>█</Text>
          </Box>
          {typeError
            ? <Text color="red">{typeError}</Text>
            : <Text color="gray">Enter 確認　Esc 返回</Text>
          }
        </Box>
      )}
    </Box>
  );
}
