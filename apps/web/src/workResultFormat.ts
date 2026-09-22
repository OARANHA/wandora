export type WorkResultInlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'code'; text: string };

export type WorkResultBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; content: WorkResultInlineToken[] }
  | { kind: 'paragraph'; content: WorkResultInlineToken[] }
  | { kind: 'unordered-list'; items: WorkResultInlineToken[][] }
  | { kind: 'ordered-list'; items: WorkResultInlineToken[][] }
  | { kind: 'quote'; content: WorkResultInlineToken[] };

function stripLinkTargets(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^\s)]+(?:\s+"[^"]*")?\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\s)]+(?:\s+"[^"]*")?\)/g, '$1');
}

export function parseWorkResultInline(value: string): WorkResultInlineToken[] {
  const source = stripLinkTargets(value);
  const tokens: WorkResultInlineToken[] = [];
  let index = 0;
  let plain = '';

  const flushPlain = () => {
    if (!plain) return;
    tokens.push({ kind: 'text', text: plain });
    plain = '';
  };

  while (index < source.length) {
    if (source.startsWith('**', index) || source.startsWith('__', index)) {
      const delimiter = source.slice(index, index + 2);
      const end = source.indexOf(delimiter, index + 2);
      if (end > index + 2) {
        flushPlain();
        tokens.push({ kind: 'strong', text: source.slice(index + 2, end) });
        index = end + 2;
        continue;
      }
    }

    if (source[index] === '`') {
      const end = source.indexOf('`', index + 1);
      if (end > index + 1) {
        flushPlain();
        tokens.push({ kind: 'code', text: source.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    plain += source[index];
    index += 1;
  }

  flushPlain();
  return tokens;
}

export function parseWorkResult(value: string): WorkResultBlock[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: WorkResultBlock[] = [];
  let paragraph: string[] = [];
  let unordered: WorkResultInlineToken[][] = [];
  let ordered: WorkResultInlineToken[][] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({
      kind: 'paragraph',
      content: parseWorkResultInline(paragraph.join(' ')),
    });
    paragraph = [];
  };

  const flushLists = () => {
    if (unordered.length) {
      blocks.push({ kind: 'unordered-list', items: unordered });
      unordered = [];
    }
    if (ordered.length) {
      blocks.push({ kind: 'ordered-list', items: ordered });
      ordered = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushLists();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushLists();
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        content: parseWorkResultInline(heading[2]),
      });
      continue;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (unorderedItem) {
      flushParagraph();
      if (ordered.length) flushLists();
      unordered.push(parseWorkResultInline(unorderedItem[1]));
      continue;
    }

    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (orderedItem) {
      flushParagraph();
      if (unordered.length) flushLists();
      ordered.push(parseWorkResultInline(orderedItem[1]));
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      flushLists();
      blocks.push({
        kind: 'quote',
        content: parseWorkResultInline(quote[1]),
      });
      continue;
    }

    flushLists();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushLists();
  return blocks;
}

export function workResultPlainText(value: string, maxLength = 280): string {
  const plain = value
    .replace(/!\[([^\]]*)\]\([^\s)]+(?:\s+"[^"]*")?\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\s)]+(?:\s+"[^"]*")?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
