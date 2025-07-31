# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lightweight web viewer for Claude Code conversation files with a terminal-inspired ASCII aesthetic. It provides a file-system-based interface to browse projects from `~/.claude/projects` and view JSONL conversation files in a compact, expandable format.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm start
npm run dev

# No build process - uses vanilla HTML/CSS/JS
```

## Architecture

### Three-Tier Structure
1. **Backend** (`server.js`): Express server that scans `~/.claude/projects` and serves JSONL files
2. **Frontend** (`public/app.js`): Single-page vanilla JavaScript application with vim-style keyboard navigation
3. **Styling** (`public/style.css`): GitHub Dark theme with terminal ASCII aesthetics

### Key Components

**ClaudeViewer Class** (main frontend controller):
- Project/conversation navigation with keyboard shortcuts (j/k/h/l)
- Panel toggle system (sidebar/conversations can be hidden)
- Message rendering with expandable tool calls and thinking blocks
- Full-text search across all conversations

**Server API Structure**:
- `/api/projects` - Returns projects with stats (total/assistant/user message counts)
- `/api/projects/:project/conversations` - Lists conversations with metadata
- `/api/projects/:project/conversations/:file` - Returns parsed JSONL messages
- `/api/search?q=term` - Full-text search with result limiting

### Data Flow
1. Server scans encoded project directories (`-Users-path-project` format)
2. Projects decoded to readable paths, URLs simplified to project names only
3. JSONL files parsed line-by-line for message objects
4. Frontend renders with expandable sections and syntax highlighting

## Code Architecture

### Message Rendering Pipeline
- **Content Types**: text, thinking blocks, tool_use, tool_result
- **Rendering**: Markdown-like processing with code block detection
- **Interactivity**: Click-to-expand sections with yellow keyboard selection highlighting
- **Syntax Highlighting**: Local implementation (replaced external CDN dependency)

### State Management
- URL routing: `/:projectName/:conversationName` (simplified from full paths)
- Local storage: Layout preferences (panel sizes, visibility)
- Selection tracking: Keyboard navigation indices for vim-style controls

### Security Model
- Read-only file system access limited to `~/.claude/projects`
- Path traversal prevention with basename validation
- Content escaping for XSS prevention
- File size limits (25MB for conversations, 10MB for scanning)

## Keyboard Navigation

Vim-style shortcuts implemented:
- `j/k` - Navigate conversations (one-by-one, no wrapping)
- `h/l` - Navigate projects (one-by-one, no wrapping)  
- `Enter` - Select highlighted item
- `1/2` - Toggle sidebar/conversations panels
- `/` - Focus search
- `g/G` - Go to first/last
- `Escape` - Clear selection

## UI Components

### Panel System
- **Sidebar**: Projects list with message counts `(total/assistant/user)`
- **Conversations Panel**: Toggleable conversation list
- **Detail Panel**: Message thread with expandable sections
- **Footer**: Keyboard shortcuts cheat sheet and status

### Text Handling
- Project paths truncated with ellipsis to prevent overflow
- Project names extracted from full paths for cleaner URLs
- All text properly escaped and contained within card boundaries

## File Structure Context

- `server.js` - Single-file Express server (~400 lines)
- `public/app.js` - Frontend application class (~800 lines)  
- `public/style.css` - Terminal styling with responsive design
- `public/index.html` - Single-page application shell
- `SPECS.md` - Comprehensive technical specification
- No build tooling - direct file serving

## Development Notes

### Local Development
- Server auto-serves static files from `public/`
- No hot reloading - manual browser refresh needed
- Console logging enabled for debugging navigation

### Performance Considerations  
- Stats calculation can be slow with many large conversations
- Search limited to 100 results to prevent memory issues
- Large files (>25MB) may cause browser performance problems

### Styling Approach
- Monospace fonts throughout (Fira Code, JetBrains Mono fallbacks)
- GitHub Dark color palette with terminal green/red/yellow accents
- Fixed layout with responsive breakpoints for mobile
- CSS specificity managed with `!important` for hidden panel states