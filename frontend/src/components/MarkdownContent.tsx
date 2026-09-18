import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  onCitationClick?: (pageNumber: number) => void;
}

type MarkdownPart =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string };

export default function MarkdownContent({ content, onCitationClick }: MarkdownContentProps) {
  const renderFormattedText = (text: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: MarkdownPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", language: match[1] || "text", value: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }

    return (
      <div className="space-y-3 leading-relaxed text-[#172033] dark:text-[#F4F5F7] text-sm">
        {parts.map((part, idx) => {
          if (part.type === "code") {
            return <CodeBlock key={idx} language={part.language} code={part.value} />;
          }
          return (
            <div key={idx} className="space-y-2">
              {part.value.split("\n\n").map((para, pIdx) => renderParagraph(para, pIdx, onCitationClick))}
            </div>
          );
        })}
      </div>
    );
  };

  return <div className="prose-custom">{renderFormattedText(content)}</div>;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white dark:bg-[#121A2D] border-b border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0]">
        <span className="font-mono text-xs uppercase font-bold text-[#6C5CE7] dark:text-[#8175F5]">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-[#F0EDFF] dark:hover:bg-[#211D42] text-[11px] text-[#667085] dark:text-[#A7B0C0] hover:text-[#6C5CE7] dark:hover:text-[#8175F5] transition"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-[#172033] dark:text-[#F4F5F7] overflow-x-auto leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderParagraph(paragraph: string, key: number, onCitationClick?: (pageNumber: number) => void) {
  const trimmed = paragraph.trim();
  if (!trimmed) return null;

  // Header 3 / 2 / 1
  if (trimmed.startsWith("### ")) {
    return (
      <h4 key={key} className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7] tracking-tight mt-3 mb-1">
        {formatInline(trimmed.replace(/^###\s+/, ""), onCitationClick)}
      </h4>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h3 key={key} className="text-base font-bold text-[#172033] dark:text-[#F4F5F7] tracking-tight mt-4 mb-1">
        {formatInline(trimmed.replace(/^##\s+/, ""), onCitationClick)}
      </h3>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h2 key={key} className="text-lg font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight mt-4 mb-2">
        {formatInline(trimmed.replace(/^#\s+/, ""), onCitationClick)}
      </h2>
    );
  }

  // Bullet list
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
    const lines = trimmed.split("\n");
    return (
      <ul key={key} className="space-y-1.5 my-2 pl-4 list-disc marker:text-[#6C5CE7] dark:marker:text-[#8175F5]">
        {lines.map((line, lIdx) => {
          const itemText = line.replace(/^(\*|-|\d+\.)\s+/, "");
          return (
            <li key={lIdx} className="text-[#172033] dark:text-[#F4F5F7] text-xs sm:text-sm pl-1">
              {formatInline(itemText, onCitationClick)}
            </li>
          );
        })}
      </ul>
    );
  }

  // Blockquote / refusal notice
  if (trimmed.startsWith("> ")) {
    return (
      <blockquote
        key={key}
        className="my-2 border-l-2 border-[#6C5CE7] dark:border-[#8175F5] pl-3.5 py-1 text-xs sm:text-sm text-[#172033] dark:text-[#F4F5F7] italic bg-[#F0EDFF]/40 dark:bg-[#211D42]/40 rounded-r-lg"
      >
        {formatInline(trimmed.replace(/^>\s*/, ""), onCitationClick)}
      </blockquote>
    );
  }

  // Standard Paragraph
  return (
    <p key={key} className="text-xs sm:text-sm text-[#172033] dark:text-[#F4F5F7] leading-relaxed">
      {formatInline(trimmed, onCitationClick)}
    </p>
  );
}

function formatInline(text: string, onCitationClick?: (pageNumber: number) => void): React.ReactNode[] {
  const tokenRegex = /(\[Page\s+(\d+)\]|\(Page\s+(\d+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const pageNum = match[2] || match[3];
    const boldText = match[4];
    const codeText = match[5];

    if (pageNum) {
      const page = parseInt(pageNum, 10);
      nodes.push(
        <span
          key={match.index}
          onClick={() => onCitationClick && onCitationClick(page)}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-white dark:bg-[#18223A] hover:bg-[#F0EDFF] dark:hover:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/40 transition cursor-pointer shadow-2xs"
          title={`Jump to Page ${page} in source viewer`}
        >
          [Page {page}]
        </span>
      );
    } else if (boldText) {
      nodes.push(
        <strong key={match.index} className="font-bold text-[#172033] dark:text-[#F4F5F7]">
          {boldText}
        </strong>
      );
    } else if (codeText) {
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 text-[11px] font-mono text-[#6C5CE7] dark:text-[#8175F5] font-semibold"
        >
          {codeText}
        </code>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
