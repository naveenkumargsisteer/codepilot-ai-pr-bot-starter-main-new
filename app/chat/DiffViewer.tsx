import React, { useState, useMemo } from 'react';
import { diffLines } from 'diff';

interface DiffViewerProps {
  oldContent?: string;
  newContent: string;
}

export function DiffViewer({ oldContent = '', newContent }: DiffViewerProps) {
  const [mode, setMode] = useState<'split' | 'unified'>('split');

  const diffResult = useMemo(() => {
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent]);

  const renderUnified = () => {
    let oldLineNum = 1;
    let newLineNum = 1;
    
    return (
      <div className="diff-unified">
        {diffResult.map((part, index) => {
          const lines = part.value.replace(/\n$/, '').split('\n');
          return lines.map((line, lineIndex) => {
            const currentOldNum = part.added ? '' : oldLineNum++;
            const currentNewNum = part.removed ? '' : newLineNum++;
            
            let lineClass = 'diff-line';
            let prefix = ' ';
            if (part.added) { lineClass += ' diff-added'; prefix = '+'; }
            if (part.removed) { lineClass += ' diff-removed'; prefix = '-'; }
            
            return (
              <div key={`${index}-${lineIndex}`} className={lineClass}>
                <div className="diff-line-num">{currentOldNum}</div>
                <div className="diff-line-num">{currentNewNum}</div>
                <div className="diff-line-content">
                  <span className="diff-prefix">{prefix}</span>
                  {line || ' '}
                </div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  const renderSplit = () => {
    let oldLineNum = 1;
    let newLineNum = 1;

    const rows: { type: 'common' | 'added' | 'removed' | 'changed', left?: string, right?: string, leftNum?: number, rightNum?: number }[] = [];

    for (let i = 0; i < diffResult.length; i++) {
      const part = diffResult[i];
      const lines = part.value.replace(/\n$/, '').split('\n');
      
      if (!part.added && !part.removed) {
        lines.forEach(line => {
          rows.push({ type: 'common', left: line, right: line, leftNum: oldLineNum++, rightNum: newLineNum++ });
        });
      } else if (part.removed) {
        if (i + 1 < diffResult.length && diffResult[i + 1].added) {
          const addedPart = diffResult[i + 1];
          const addedLines = addedPart.value.replace(/\n$/, '').split('\n');
          const maxLines = Math.max(lines.length, addedLines.length);
          for (let j = 0; j < maxLines; j++) {
            rows.push({
              type: 'changed',
              left: j < lines.length ? lines[j] : undefined,
              right: j < addedLines.length ? addedLines[j] : undefined,
              leftNum: j < lines.length ? oldLineNum++ : undefined,
              rightNum: j < addedLines.length ? newLineNum++ : undefined
            });
          }
          i++; 
        } else {
          lines.forEach(line => {
            rows.push({ type: 'removed', left: line, leftNum: oldLineNum++ });
          });
        }
      } else if (part.added) {
        lines.forEach(line => {
          rows.push({ type: 'added', right: line, rightNum: newLineNum++ });
        });
      }
    }

    return (
      <div className="diff-split">
        {rows.map((row, index) => (
          <div key={index} className="diff-split-row">
            <div className={`diff-split-half ${row.left !== undefined ? (row.type === 'removed' || row.type === 'changed' ? 'diff-removed' : '') : 'diff-empty'}`}>
              <div className="diff-line-num">{row.leftNum || ''}</div>
              <div className="diff-line-content">
                <span className="diff-prefix">{row.left !== undefined ? (row.type === 'removed' || row.type === 'changed' ? '-' : ' ') : ''}</span>
                {row.left !== undefined ? row.left || ' ' : ''}
              </div>
            </div>
            <div className={`diff-split-half ${row.right !== undefined ? (row.type === 'added' || row.type === 'changed' ? 'diff-added' : '') : 'diff-empty'}`}>
              <div className="diff-line-num">{row.rightNum || ''}</div>
              <div className="diff-line-content">
                <span className="diff-prefix">{row.right !== undefined ? (row.type === 'added' || row.type === 'changed' ? '+' : ' ') : ''}</span>
                {row.right !== undefined ? row.right || ' ' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-tabs">
          <button 
            type="button"
            className={`diff-tab ${mode === 'split' ? 'active' : ''}`}
            onClick={() => setMode('split')}
          >
            Split
          </button>
          <button 
            type="button"
            className={`diff-tab ${mode === 'unified' ? 'active' : ''}`}
            onClick={() => setMode('unified')}
          >
            Unified
          </button>
        </div>
      </div>
      <div className="diff-body">
        {mode === 'split' ? renderSplit() : renderUnified()}
      </div>
    </div>
  );
}
