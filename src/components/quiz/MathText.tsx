import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders text with LaTeX formulas.
 * Supports:
 *  - $$...$$  → block math
 *  - $...$    → inline math
 *  - \(...\)  → inline math
 *  - \[...\]  → block math
 */
export default function MathText({ text, className }: Props) {
  if (!text) return null;

  // Tokenize into [text|inline|block] segments
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        try {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return <BlockMath key={i} math={part.slice(2, -2)} />;
          }
          if (part.startsWith('\\[') && part.endsWith('\\]')) {
            return <BlockMath key={i} math={part.slice(2, -2)} />;
          }
          if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
            return <InlineMath key={i} math={part.slice(1, -1)} />;
          }
          if (part.startsWith('\\(') && part.endsWith('\\)')) {
            return <InlineMath key={i} math={part.slice(2, -2)} />;
          }
        } catch {
          return <span key={i}>{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
