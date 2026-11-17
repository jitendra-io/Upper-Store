import React from 'react';
import './MarkdownViewer.css';

// Sanitize raw text to prevent XSS injection
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Parse inline Markdown tokens (bold, italic, code, links, strikethrough)
const parseInline = (text) => {
  if (!text) return '';
  let res = escapeHtml(text);

  // Inline code: `code`
  res = res.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold: **text** or __text__
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  res = res.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  res = res.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');

  // Strikethrough: ~~text~~
  res = res.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Safe links: [label](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawUrl) => {
    const cleanUrl = rawUrl.trim();
    if (/^(https?:\/\/|\/|mailto:)/i.test(cleanUrl)) {
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${label}</a>`;
    }
    return label;
  });

  return res;
};

// Parse markdown string into structured semantic blocks
const parseBlocks = (markdown) => {
  if (!markdown || typeof markdown !== 'string') return [];
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Fenced Code Blocks (```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        type: 'code',
        lang,
        content: codeLines.join('\n')
      });
      continue;
    }

    // 2. Headings (# to ######)
    const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim()
      });
      i++;
      continue;
    }

    // 3. Blockquotes (>)
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: quoteLines.join('\n')
      });
      continue;
    }

    // 4. Horizontal Rules (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 5. Unordered List (- or *)
    if (/^[\*\-]\s+(.*)$/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[\*\-]\s+(.*)$/.test(lines[i].trim())) {
        const itemMatch = lines[i].trim().match(/^[\*\-]\s+(.*)$/);
        items.push(itemMatch[1]);
        i++;
      }
      blocks.push({
        type: 'ul',
        items
      });
      continue;
    }

    // 6. Ordered List (1. 2. 3.)
    if (/^\d+\.\s+(.*)$/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+(.*)$/.test(lines[i].trim())) {
        const itemMatch = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        items.push(itemMatch[1]);
        i++;
      }
      blocks.push({
        type: 'ol',
        items
      });
      continue;
    }

    // 7. Markdown Tables (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.includes('|---')) {
      const headers = trimmed.split('|').slice(1, -1).map(c => c.trim());
      i += 2; // Skip header row and divider row
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        rows.push(rowCells);
        i++;
      }
      blocks.push({
        type: 'table',
        headers,
        rows
      });
      continue;
    }

    // 8. Blank lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 9. Standard Paragraphs
    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].trim().startsWith('>') &&
      !/^[\*\-]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|') && lines[i + 1]?.includes('|---'))
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        type: 'p',
        content: pLines.join('\n')
      });
    }
  }

  return blocks;
};

const MarkdownViewer = ({ content, className = '' }) => {
  if (!content || !content.trim()) {
    return (
      <div className={`markdown-empty-state ${className}`}>
        <span>No release notes or details provided.</span>
      </div>
    );
  }

  const blocks = parseBlocks(content);

  return (
    <div className={`markdown-rendered-view ${className}`}>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'heading': {
            const innerHtml = { __html: parseInline(b.content) };
            if (b.level === 1) return <h3 key={idx} className="md-h1" dangerouslySetInnerHTML={innerHtml} />;
            if (b.level === 2) return <h4 key={idx} className="md-h2" dangerouslySetInnerHTML={innerHtml} />;
            if (b.level === 3) return <h5 key={idx} className="md-h3" dangerouslySetInnerHTML={innerHtml} />;
            return <h6 key={idx} className="md-h-sub" dangerouslySetInnerHTML={innerHtml} />;
          }

          case 'code':
            return (
              <div key={idx} className="md-code-block-wrap">
                {b.lang && <span className="md-code-lang-tag">{b.lang}</span>}
                <pre className="md-code-block">
                  <code>{b.content}</code>
                </pre>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote key={idx} className="md-blockquote">
                <p dangerouslySetInnerHTML={{ __html: parseInline(b.content) }} />
              </blockquote>
            );

          case 'hr':
            return <hr key={idx} className="md-hr" />;

          case 'ul':
            return (
              <ul key={idx} className="md-ul">
                {b.items.map((item, itemIdx) => (
                  <li key={itemIdx} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="md-ol">
                {b.items.map((item, itemIdx) => (
                  <li key={itemIdx} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
                ))}
              </ol>
            );

          case 'table':
            return (
              <div key={idx} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      {b.headers.map((h, hIdx) => (
                        <th key={hIdx} dangerouslySetInnerHTML={{ __html: parseInline(h) }} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} dangerouslySetInnerHTML={{ __html: parseInline(cell) }} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'p':
          default:
            return (
              <p
                key={idx}
                className="md-p"
                dangerouslySetInnerHTML={{ __html: parseInline(b.content) }}
              />
            );
        }
      })}
    </div>
  );
};

export default MarkdownViewer;
