import type * as Monaco from 'monaco-editor';
import { findStatementAtCursor } from '@/lib/query-utils';

export function getQueryFromEditor(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  fallbackQuery: string
): string {
  if (!editor) return fallbackQuery;

  const selection = editor.getSelection();
  if (selection && !selection.isEmpty()) {
    const model = editor.getModel();
    return model ? model.getValueInRange(selection) : editor.getValue();
  }

  const model = editor.getModel();
  if (model) {
    const position = editor.getPosition();
    if (position) {
      const fullText = editor.getValue() || fallbackQuery;
      const lineNumber = position.lineNumber; // 1-based
      return findStatementAtCursor(fullText, lineNumber, true);
    }
  }

  return editor.getValue() || fallbackQuery;
}

export function findErrorLine(errorMessage: string, queryText: string): number | null {
  const lineNumberMatch = errorMessage.match(/line\s+(\d+)|position\s+(\d+)|at\s+line\s+(\d+)/i);
  if (lineNumberMatch) {
    const lineNum = parseInt(lineNumberMatch[1] || lineNumberMatch[2] || lineNumberMatch[3], 10);
    if (lineNum > 0) {
      return lineNum;
    }
  }

  const lines = queryText.split('\n');
  const errorLower = errorMessage.toLowerCase();

  const columnMatch = errorMessage.match(/column\s+["']?(\w+)["']?/i);
  const tableMatch = errorMessage.match(/table\s+["']?(\w+)["']?/i);
  const relationMatch = errorMessage.match(/relation\s+["']?(\w+)["']?/i);

  const searchTerm = columnMatch?.[1] || tableMatch?.[1] || relationMatch?.[1];

  if (searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      const lineTrimmed = line.trim();

      if ((lineLower.includes('where') || lineTrimmed.endsWith(';')) &&
          lineLower.includes(searchTermLower)) {
        return i + 1;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.includes(searchTermLower)) {
        return i + 1;
      }
    }
  }

  if (errorLower.includes('syntax error') || errorLower.includes('parse error')) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.endsWith(';') || line.toLowerCase().startsWith('where')) {
        return i + 1;
      }
    }
  }

  return null;
}
