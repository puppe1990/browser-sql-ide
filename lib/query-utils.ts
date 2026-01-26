/**
 * Process query to ensure complete lines are considered when ending with semicolon
 * When a line ends with semicolon, the entire line content is preserved
 */
export function processQuery(query: string): string {
  if (!query) return '';
  
  // Split by lines and process each line
  const lines = query.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // If line ends with semicolon, keep the entire line content (including any trailing spaces before semicolon)
    if (trimmedLine.endsWith(';')) {
      // Find the last semicolon position in the original line
      const lastSemicolonIndex = line.lastIndexOf(';');
      if (lastSemicolonIndex !== -1) {
        // Keep everything from start to semicolon (inclusive), then trim only leading spaces
        const beforeSemicolon = line.substring(0, lastSemicolonIndex + 1);
        processedLines.push(beforeSemicolon.trimStart());
      } else {
        processedLines.push(trimmedLine);
      }
    } else if (trimmedLine) {
      // For non-empty lines without semicolon, trim normally
      processedLines.push(trimmedLine);
    } else if (i === lines.length - 1) {
      // Skip trailing empty lines
      continue;
    } else {
      // Keep empty lines in the middle
      processedLines.push('');
    }
  }
  
  // Join lines and trim only leading/trailing whitespace from the entire query
  return processedLines.join('\n').trim();
}
