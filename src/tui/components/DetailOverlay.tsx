import React from 'react';
import { Box, Text } from 'ink';
import type { Route } from '../../models/route.js';
import type { Secret } from '../../models/secret.js';
import type { WebEntry } from '../../models/entry.js';

type DetailItem = Route | Secret | WebEntry;

function isRoute(item: DetailItem): item is Route {
  return 'httpMethod' in item && 'path' in item;
}
function isSecret(item: DetailItem): item is Secret {
  return 'secretType' in item;
}

function Row({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <Box flexDirection="row" gap={1}>
      <Text color="gray" bold>{label.padEnd(12)}</Text>
      <Text>{String(value)}</Text>
    </Box>
  );
}

interface Props {
  item: DetailItem;
}

export function DetailOverlay({ item }: Props) {
  const bname = (p: string) => p.split('/').pop() ?? p;

  return (
    <Box borderStyle="round" borderColor="blueBright" flexDirection="column" padding={1} marginTop={1} gap={1}>
      {isRoute(item) && (
        <>
          <Text bold color="blueBright"> Route Detail</Text>
          <Box marginTop={1} flexDirection="column">
            <Row label="Method"     value={item.httpMethod} />
            <Row label="Path"       value={item.path} />
            <Row label="Handler"    value={item.className ? `${item.className}#${item.methodName ?? ''}` : undefined} />
            <Row label="File"       value={`${bname(item.sourceFile)}${item.lineNumber ? ':' + item.lineNumber : ''}`} />
            <Row label="Framework"  value={item.framework} />
            <Row label="Confidence" value={item.confidence} />
          </Box>
        </>
      )}
      {isSecret(item) && (
        <>
          <Text bold color="red"> Secret Detail</Text>
          <Box marginTop={1} flexDirection="column">
            <Row label="Type"       value={item.secretType} />
            <Row label="Severity"   value={item.severity} />
            <Row label="File"       value={`${bname(item.filePath)}:${item.lineNumber}`} />
            <Row label="Masked"     value={item.maskedValue} />
            <Row label="Confidence" value={item.confidence} />
            <Row label="Rule"       value={item.ruleId} />
          </Box>
        </>
      )}
      {!isRoute(item) && !isSecret(item) && (
        <>
          <Text bold color="blueBright"> Entry Detail</Text>
          <Box marginTop={1} flexDirection="column">
            <Row label="Type"       value={(item as WebEntry).entryType} />
            <Row label="Target"     value={(item as WebEntry).targetPath} />
            <Row label="Invoke"     value={(item as WebEntry).invokeType} />
            <Row label="File"       value={`${bname((item as WebEntry).sourceFile)}:${(item as WebEntry).lineNumber}`} />
            <Row label="Confidence" value={(item as WebEntry).confidence} />
          </Box>
        </>
      )}
      <Text color="gray" dimColor>Esc 返回列表</Text>
    </Box>
  );
}
