import { useState, useRef } from 'react';
import MarkdownViewer from './MarkdownViewer';
import './MarkdownReleaseNotesField.css';

const MarkdownReleaseNotesField = ({
  value = '',
  onChange,
  label = "Release Notes / What's New",
  placeholder = "Write changelog in Markdown or upload a .md file (e.g. # What's New in v1.0.0...)",
  maxLength = 25000,
  id = 'release-notes-field',
  required = false,
  hint = 'Supports standard Markdown formatting: headings (#), lists (-), bold (**), code (`), and links.'
}) => {
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [importedFileName, setImportedFileName] = useState('');
  const [importedFileSize, setImportedFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper to format byte sizes
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Process text from a selected or dropped Markdown file
  const handleFile = (file) => {
    if (!file) return;

    const name = file.name || '';
    const cleanNameLower = name.toLowerCase();
    const isMarkdown =
      cleanNameLower.endsWith('.md') ||
      cleanNameLower.endsWith('.markdown') ||
      cleanNameLower.endsWith('.txt') ||
      file.type === 'text/markdown' ||
      file.type === 'text/plain';

    if (!isMarkdown) {
      setStatusMsg({
        type: 'error',
        text: 'Invalid file format. Please upload a Markdown file (.md, .markdown, or .txt).'
      });
      return;
    }

    // 1 MB limit for release notes file
    if (file.size > 1024 * 1024) {
      setStatusMsg({
        type: 'error',
        text: 'File is too large. Release notes must be under 1 MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result || '';
        if (text.length > maxLength) {
          onChange(text.slice(0, maxLength));
          setStatusMsg({
            type: 'error',
            text: `Imported ${name} (truncated to ${maxLength} character limit).`
          });
        } else {
          onChange(text);
          setStatusMsg({
            type: 'success',
            text: `Successfully imported ${name} (${formatSize(file.size)}).`
          });
        }
        setImportedFileName(name);
        setImportedFileSize(formatSize(file.size));
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: `Failed to read file: ${err.message}`
        });
      }
    };

    reader.onerror = () => {
      setStatusMsg({
        type: 'error',
        text: 'Error reading the file from local storage.'
      });
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset file input value so user can re-select same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFile(droppedFiles[0]);
    }
  };

  // Formatting toolbar actions that manipulate textarea selection
  const insertFormatting = (prefix, suffix = '', placeholderText = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentText = value || '';

    const selectedText = currentText.substring(start, end) || placeholderText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    if (newText.length <= maxLength) {
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        const cursorPosition = start + prefix.length + selectedText.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);
    }
  };

  const clearImported = () => {
    setImportedFileName('');
    setImportedFileSize('');
    setStatusMsg(null);
  };

  const clearAllText = () => {
    if (value && value.length > 30) {
      if (!window.confirm('Clear all release notes text?')) return;
    }
    onChange('');
    clearImported();
  };

  const currentLength = (value || '').length;

  return (
    <div className="md-field-container">
      {/* Top Header Row: Label & Actions */}
      <div className="md-field-header">
        <label htmlFor={id} className="md-field-label">
          {label} {required && <span className="req-star">*</span>}
        </label>

        <div className="md-header-actions">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            id={`${id}-file-input`}
          />

          {/* Upload .md File Button */}
          <button
            type="button"
            onClick={triggerUploadClick}
            className="md-action-btn md-upload-btn"
            title="Import release notes from a .md or changelog file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Upload .md</span>
          </button>

          {/* Tabs: Write & Preview */}
          <div className="md-tabs-switch">
            <button
              type="button"
              className={`md-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
              onClick={() => setActiveTab('write')}
            >
              Write
            </button>
            <button
              type="button"
              className={`md-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor Box with Drag-and-Drop Area */}
      <div
        className={`md-editor-box ${isDragging ? 'is-dragging-over' : ''} ${activeTab === 'preview' ? 'preview-mode' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="md-drop-overlay">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e61919" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <polyline points="9 15 12 12 15 15"></polyline>
            </svg>
            <span>Drop .md or Markdown file here</span>
          </div>
        )}

        {/* Toolbar in Write Mode */}
        {activeTab === 'write' && (
          <div className="md-toolbar">
            <div className="md-toolbar-group">
              <button
                type="button"
                className="md-tool-btn"
                title="Bold (**text**)"
                onClick={() => insertFormatting('**', '**', 'bold text')}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className="md-tool-btn"
                title="Italic (*text*)"
                onClick={() => insertFormatting('*', '*', 'italic text')}
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className="md-tool-btn"
                title="Heading 3 (### Heading)"
                onClick={() => insertFormatting('### ', '\n', 'Heading')}
              >
                H
              </button>
              <button
                type="button"
                className="md-tool-btn"
                title="Bullet List (- item)"
                onClick={() => insertFormatting('- ', '\n', 'List item')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
              <button
                type="button"
                className="md-tool-btn"
                title="Code Block"
                onClick={() => insertFormatting('```\n', '\n```', '// code')}
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                className="md-tool-btn"
                title="Link ([Title](url))"
                onClick={() => insertFormatting('[', '](https://)', 'Link Title')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
            </div>

            {value && (
              <button
                type="button"
                className="md-tool-clear-btn"
                title="Clear content"
                onClick={clearAllText}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Content Pane */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            id={id}
            rows={5}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            required={required}
            className="md-textarea"
          />
        ) : (
          <div className="md-preview-pane">
            <MarkdownViewer content={value} />
          </div>
        )}
      </div>

      {/* Status Bar: Imported file badge & char count */}
      <div className="md-status-bar">
        <div className="md-status-left">
          {importedFileName ? (
            <div className="md-imported-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span className="md-imported-name">{importedFileName}</span>
              {importedFileSize && <span className="md-imported-size">({importedFileSize})</span>}
              <button
                type="button"
                className="md-imported-remove"
                onClick={clearImported}
                title="Remove imported file badge"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ) : (
            <span className="md-field-hint">{hint}</span>
          )}
        </div>

        <div className="md-status-right">
          <span className={`md-char-count ${currentLength >= maxLength * 0.9 ? 'limit-warning' : ''}`}>
            {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Floating Status Message */}
      {statusMsg && (
        <div className={`md-feedback-toast ${statusMsg.type}`}>
          <span>{statusMsg.text}</span>
          <button type="button" onClick={() => setStatusMsg(null)} aria-label="Close message">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MarkdownReleaseNotesField;
