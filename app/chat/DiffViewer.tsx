import React, { useState, useMemo, useEffect } from 'react';
import { diffLines } from 'diff';

interface DiffViewerProps {
  oldContent?: string;
  newContent: string;
}

export function DiffViewer({ oldContent = '', newContent }: DiffViewerProps) {
  const [mode, setMode] = useState<'split' | 'unified'>('split');
  const [currentHunk, setCurrentHunk] = useState(1);

  const diffResult = useMemo(() => {
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent]);

  const hunks = useMemo(() => {
    let count = 0;
    let inHunk = false;
    for (let i = 0; i < diffResult.length; i++) {
      if (diffResult[i].added || diffResult[i].removed) {
        if (!inHunk) {
          count++;
          inHunk = true;
        }
      } else {
        inHunk = false;
      }
    }
    return count;
  }, [diffResult]);

  useEffect(() => {
    setCurrentHunk(1);
  }, [diffResult]);

  const goToNextHunk = () => {
    if (currentHunk < hunks) {
      const next = currentHunk + 1;
      setCurrentHunk(next);
      document.getElementById(`hunk-${mode}-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const goToPrevHunk = () => {
    if (currentHunk > 1) {
      const prev = currentHunk - 1;
      setCurrentHunk(prev);
      document.getElementById(`hunk-${mode}-${prev}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const renderUnified = () => {
    let oldLineNum = 1;
    let newLineNum = 1;
    let currentHunkCounter = 0;
    let inHunk = false;
    
    return (
      <div className="diff-unified">
        {diffResult.map((part, index) => {
          let partIsHunkStart = false;
          if (part.added || part.removed) {
            if (!inHunk) {
              currentHunkCounter++;
              partIsHunkStart = true;
              inHunk = true;
            }
          } else {
            inHunk = false;
          }

          const lines = part.value.replace(/\n$/, '').split('\n');
          return lines.map((line, lineIndex) => {
            const currentOldNum = part.added ? '' : oldLineNum++;
            const currentNewNum = part.removed ? '' : newLineNum++;
            
            let lineClass = 'diff-line';
            let prefix = ' ';
            if (part.added) { lineClass += ' diff-added'; prefix = '+'; }
            if (part.removed) { lineClass += ' diff-removed'; prefix = '-'; }
            
            const isFirstLineOfHunk = partIsHunkStart && lineIndex === 0;
            return (
              <div key={`${index}-${lineIndex}`} id={isFirstLineOfHunk ? `hunk-unified-${currentHunkCounter}` : undefined} className={lineClass}>
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

    const rows: { type: 'common' | 'added' | 'removed' | 'changed', left?: string, right?: string, leftNum?: number, rightNum?: number, hunkStart?: number }[] = [];
    
    let currentHunkCounter = 0;
    let inHunk = false;

    for (let i = 0; i < diffResult.length; i++) {
      const part = diffResult[i];
      const lines = part.value.replace(/\n$/, '').split('\n');
      
      let partIsHunkStart = false;
      if (part.added || part.removed) {
        if (!inHunk) {
          currentHunkCounter++;
          partIsHunkStart = true;
          inHunk = true;
        }
      } else {
        inHunk = false;
      }

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
              rightNum: j < addedLines.length ? newLineNum++ : undefined,
              hunkStart: (partIsHunkStart && j === 0) ? currentHunkCounter : undefined
            });
          }
          i++; 
        } else {
          lines.forEach((line, j) => {
            rows.push({ type: 'removed', left: line, leftNum: oldLineNum++, hunkStart: (partIsHunkStart && j === 0) ? currentHunkCounter : undefined });
          });
        }
      } else if (part.added) {
        lines.forEach((line, j) => {
          rows.push({ type: 'added', right: line, rightNum: newLineNum++, hunkStart: (partIsHunkStart && j === 0) ? currentHunkCounter : undefined });
        });
      }
    }

    return (
      <div className="diff-split">
        {rows.map((row, index) => (
          <div key={index} id={row.hunkStart ? `hunk-split-${row.hunkStart}` : undefined} className="diff-split-row">
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
      <div className="diff-header" style={{ justifyContent: 'space-between' }}>
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
        
        {hunks > 0 && (
          <div className="diff-navigation" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b949e', fontSize: '13px' }}>
            <button
              type="button"
              onClick={goToPrevHunk}
              disabled={currentHunk <= 1}
              style={{ background: 'transparent', border: '1px solid #30363d', color: currentHunk <= 1 ? '#484f58' : '#c9d1d9', borderRadius: '4px', padding: '2px 10px', cursor: currentHunk <= 1 ? 'not-allowed' : 'pointer' }}
            >
              &uarr;
            </button>
            <span>{currentHunk} / {hunks}</span>
            <button
              type="button"
              onClick={goToNextHunk}
              disabled={currentHunk >= hunks}
              style={{ background: 'transparent', border: '1px solid #30363d', color: currentHunk >= hunks ? '#484f58' : '#c9d1d9', borderRadius: '4px', padding: '2px 10px', cursor: currentHunk >= hunks ? 'not-allowed' : 'pointer' }}
            >
              &darr;
            </button>
          </div>
        )}
      </div>
      <div className="diff-body">
        {mode === 'split' ? renderSplit() : renderUnified()}
      </div>
    </div>
  );
}
