import type { ReactNode } from 'react';
import {
  parseWorkResult,
  type WorkResultInlineToken,
} from '../workResultFormat';

function InlineContent({ tokens }: { tokens: WorkResultInlineToken[] }) {
  const nodes: ReactNode[] = tokens.map((token, index) => {
    if (token.kind === 'strong') {
      return <strong key={index} className="font-black text-inherit">{token.text}</strong>;
    }
    if (token.kind === 'code') {
      return (
        <code
          key={index}
          className="rounded bg-[#09090b]/8 px-1.5 py-0.5 font-mono text-[0.92em] font-semibold text-inherit"
        >
          {token.text}
        </code>
      );
    }
    return <span key={index}>{token.text}</span>;
  });

  return <>{nodes}</>;
}

export function WorkResultContent({ value }: { value: string }) {
  const blocks = parseWorkResult(value);

  return (
    <div className="space-y-3 text-sm leading-6 text-[#09090b]/80">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const className = block.level === 1
            ? 'text-base font-black text-[#09090b]'
            : block.level === 2
              ? 'text-[15px] font-black text-[#09090b]'
              : 'text-sm font-black text-[#09090b]';
          return (
            <div key={index} className={className}>
              <InlineContent tokens={block.content} />
            </div>
          );
        }

        if (block.kind === 'unordered-list') {
          return (
            <ul key={index} className="m-0 list-disc space-y-1.5 pl-5 marker:text-[#09090b]/45">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}><InlineContent tokens={item} /></li>
              ))}
            </ul>
          );
        }

        if (block.kind === 'ordered-list') {
          return (
            <ol key={index} className="m-0 list-decimal space-y-1.5 pl-5 marker:font-black marker:text-[#09090b]/55">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}><InlineContent tokens={item} /></li>
              ))}
            </ol>
          );
        }

        if (block.kind === 'quote') {
          return (
            <blockquote
              key={index}
              className="m-0 border-l-[3px] border-[#09090b] bg-[#f8f4e8] px-3 py-2 text-[#09090b]/65"
            >
              <InlineContent tokens={block.content} />
            </blockquote>
          );
        }

        return (
          <p key={index} className="m-0">
            <InlineContent tokens={block.content} />
          </p>
        );
      })}
    </div>
  );
}
