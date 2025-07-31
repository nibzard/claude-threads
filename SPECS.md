# Claude Code Project Viewer - Technical Specification

## Overview

The Claude Code Project Viewer is a lightweight web application that provides a terminal-inspired interface for browsing and viewing Claude Code conversation files stored in `~/.claude/projects`. The application features an ASCII aesthetic with monospace fonts, terminal colors, and compact collapsible views.

## Architecture

### Backend (Node.js + Express)
- **File**: `server.js`
- **Port**: 3000 (configurable)
- **Dependencies**: express, highlight.js
- **Size**: ~150 lines of code

### Frontend (Vanilla JavaScript + CSS)
- **Files**: `public/index.html`, `public/style.css`, `public/app.js`
- **Dependencies**: highlight.js (CDN)
- **Total Size**: ~800 lines of code

## Data Structure Analysis

### Claude Code Project Structure
```
~/.claude/projects/
├── -Users-nikola-dev-project1/
│   ├── session-uuid-1.jsonl
│   ├── session-uuid-2.jsonl
│   └── ...
├── -Users-nikola-dev-project2/
│   └── ...
```

### JSONL Message Format
Each line in a `.jsonl` file represents a message with the following structure:

```json
{
  "parentUuid": "parent-message-uuid",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/path/to/working/directory",
  "sessionId": "conversation-session-uuid",
  "version": "1.0.63",
  "gitBranch": "main",
  "type": "user|assistant",
  "message": {
    "role": "user|assistant",
    "content": "string|array"
  },
  "uuid": "message-uuid",
  "timestamp": "2025-07-31T15:53:16.665Z",
  "toolUseResult": "optional-tool-result"
}
```

### Message Content Types

#### User Messages
```json
{
  "message": {
    "role": "user",
    "content": "Plain text user input"
  }
}
```

#### Assistant Messages
```json
{
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Response text"
      },
      {
        "type": "thinking", 
        "thinking": "Internal reasoning"
      },
      {
        "type": "tool_use",
        "id": "tool-call-id",
        "name": "ToolName",
        "input": { "param": "value" }
      }
    ]
  }
}
```

#### Tool Result Messages
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "tool-call-id",
        "type": "tool_result",
        "content": "Tool execution result"
      }
    ]
  },
  "toolUseResult": "Raw result text"
}
```

## API Endpoints

### GET /api/projects
Returns list of all Claude Code projects.

**Response:**
```json
[
  {
    "name": "-Users-nikola-dev-project1",
    "displayName": "/Users/nikola/dev/project1", 
    "path": "/Users/nikola/.claude/projects/-Users-nikola-dev-project1"
  }
]
```

### GET /api/projects/:projectName/conversations
Returns list of conversations for a specific project.

**Response:**
```json
[
  {
    "filename": "session-uuid.jsonl",
    "sessionId": "session-uuid",
    "timestamp": "2025-07-31T15:53:16.665Z",
    "cwd": "/path/to/working/directory",
    "gitBranch": "main",
    "size": 31894
  }
]
```

### GET /api/projects/:projectName/conversations/:filename
Returns parsed conversation messages.

**Response:**
```json
{
  "filename": "session-uuid.jsonl",
  "messageCount": 42,
  "messages": [/* array of parsed message objects */]
}
```

### GET /api/search?q=searchterm
Full-text search across all conversations.

**Response:**
```json
{
  "results": [
    {
      "project": "/Users/nikola/dev/project1",
      "projectName": "-Users-nikola-dev-project1", 
      "conversation": "session-uuid",
      "filename": "session-uuid.jsonl",
      "lineNumber": 5,
      "timestamp": "2025-07-31T15:53:16.665Z",
      "type": "user",
      "preview": "Text snippet containing search term..."
    }
  ]
}
```

## Frontend Components

### Layout Structure
```
┌─ Terminal Header ─────────────────────────────┐
│ Title                              [Search]   │
├─ Terminal Body ──────────────────────────────┤
│ ┌─ Sidebar ─┐ ┌─ Main Content ──────────────┐ │
│ │ Projects  │ │ ┌─ Conversations Panel ──┐ │ │
│ │ List      │ │ │ Conversation List      │ │ │
│ │           │ │ └────────────────────────┘ │ │
│ │           │ │ ┌─ Conversation Detail ──┐ │ │
│ │           │ │ │ Message Thread        │ │ │
│ │           │ │ │                       │ │ │
│ └───────────┘ │ └────────────────────────┘ │ │
│               └────────────────────────────┘ │
├─ Terminal Footer ─────────────────────────────┤
│ Status | Projects | Conversations | Time     │
└───────────────────────────────────────────────┘
```

### Component Hierarchy
- **ClaudeViewer** (Main Application Class)
  - **Project Browser** - Left sidebar showing project list
  - **Conversation List** - Top-right panel showing conversations
  - **Message Renderer** - Bottom-right panel showing message thread
  - **Search Interface** - Header search functionality

### Message Rendering Features

#### Message Types
- **User Messages**: Blue header, plain text content
- **Assistant Messages**: Green header, supports rich content
- **Tool Results**: Red header, formatted output

#### Content Rendering
- **Text Content**: Markdown-like processing with code block support
- **Tool Calls**: Collapsible JSON parameter display with syntax highlighting
- **Thinking Blocks**: Collapsible internal reasoning sections
- **Code Blocks**: Automatic language detection and syntax highlighting

#### Interactive Features
- **Expandable Sections**: Click to expand/collapse tool calls and thinking
- **Syntax Highlighting**: Automatic highlighting for JSON, code blocks
- **Search Highlighting**: Search terms highlighted in results
- **Responsive Design**: Mobile-friendly layout

## CSS Design System

### Color Palette (GitHub Dark Theme)
```css
--bg-primary: #0d1117      /* Main background */
--bg-secondary: #161b22    /* Sidebar, panels */
--bg-tertiary: #21262d     /* Headers, inactive */
--border-primary: #30363d  /* Main borders */
--border-secondary: #484f58 /* Hover borders */
--text-primary: #c9d1d9    /* Main text */
--text-secondary: #8b949e  /* Meta text */
--accent-blue: #58a6ff     /* Links, focus */
--accent-green: #7ee787    /* Success, assistant */
--accent-red: #f85149      /* Errors, tools */
--accent-yellow: #ffd33d   /* Search highlights */
```

### Typography
- **Primary Font**: Fira Code, JetBrains Mono, Monaco, Consolas
- **Font Sizes**: 11px-13px for compact terminal feel
- **Line Height**: 1.4-1.5 for readability

### Layout Principles
- **Fixed Layout**: No floating elements, grid-based structure
- **Monospace**: All text uses monospace fonts
- **Compact Spacing**: Minimal padding/margins for information density
- **Border Graphics**: ASCII-style borders and decorative elements

## Installation & Usage

### Prerequisites
- Node.js 16+ 
- Claude Code with existing projects in `~/.claude/projects`

### Installation
```bash
# Clone or create project directory
mkdir claude-viewer && cd claude-viewer

# Install dependencies
npm install

# Start server
npm start
```

### Usage
1. **Browse Projects**: Click on projects in left sidebar
2. **View Conversations**: Click on conversations in top-right panel  
3. **Expand Messages**: Click on conversation to view message thread
4. **Search**: Use search box to find text across all conversations
5. **Expand Details**: Click on tool calls and thinking blocks to expand

### Keyboard Shortcuts
- **Enter**: Execute search
- **Escape**: Clear search input

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Messages loaded only when conversation selected
- **Pagination**: Large conversations could be paginated (future enhancement)
- **Caching**: File system scanning cached for 5 minutes
- **Search Limits**: Search results limited to 100 matches
- **Memory Management**: Large files streamed rather than loaded entirely

### Scalability Limits
- **File Size**: JSONL files > 25MB may cause browser performance issues
- **Project Count**: 1000+ projects may slow initial loading
- **Concurrent Users**: Single-threaded Node.js limits concurrent usage

## Security Considerations

### File System Access
- **Read-Only**: Application only reads files, never writes
- **Sandboxed**: Only accesses `~/.claude/projects` directory
- **Path Validation**: Prevents directory traversal attacks
- **Error Handling**: Graceful degradation for missing/corrupted files

### Web Security
- **No Authentication**: Intended for local development use only
- **XSS Prevention**: All user content escaped before rendering
- **CORS**: Limited to same-origin requests
- **Input Validation**: Search queries sanitized

## Development Roadmap

### Phase 1 (Complete)
- [x] Basic project/conversation browsing
- [x] Message thread rendering
- [x] Tool call visualization
- [x] Search functionality
- [x] ASCII terminal aesthetics

### Phase 2 (Future Enhancements)
- [ ] Export conversations to various formats (PDF, HTML, Markdown)
- [ ] Advanced search filters (date range, message type, tool usage)
- [ ] Conversation statistics and analytics
- [ ] Real-time file watching for new conversations
- [ ] Dark/light theme toggle
- [ ] Keyboard navigation shortcuts

### Phase 3 (Advanced Features)
- [ ] Conversation comparison and diff tools
- [ ] Integration with git for version tracking
- [ ] Collaborative viewing with multiple users
- [ ] Plugin system for custom message renderers
- [ ] REST API for external integrations

## Technical Decisions

### Technology Choices

#### Node.js + Express vs Ruby Sinatra
**Decision**: Node.js + Express
**Rationale**: 
- Better JSON handling for JSONL parsing
- Smaller memory footprint
- Faster startup time
- More ubiquitous for development teams

#### Vanilla JS vs React/Vue
**Decision**: Vanilla JavaScript
**Rationale**:
- Lighter weight (no framework dependencies)
- Faster loading in terminal environment
- Simpler maintenance
- Better control over terminal aesthetics

#### highlight.js vs Prism.js
**Decision**: highlight.js
**Rationale**:
- Better language auto-detection
- Terminal-compatible themes
- Smaller bundle size for needed features
- CDN availability

### Design Decisions

#### Fixed Layout vs Responsive
**Decision**: Fixed layout with responsive breakpoints
**Rationale**:
- Terminal applications traditionally use fixed layouts
- Better information density
- Consistent viewing experience
- Mobile fallback for basic usage

#### Real-time Updates vs Static Loading
**Decision**: Static loading with manual refresh
**Rationale**:
- Simpler implementation
- Lower resource usage
- Conversations are typically historical
- Manual refresh gives user control

## Troubleshooting

### Common Issues

#### No Projects Found
- **Cause**: `~/.claude/projects` directory doesn't exist
- **Solution**: Use Claude Code to create at least one project

#### Conversations Not Loading
- **Cause**: Malformed JSONL files or permission issues
- **Solution**: Check file permissions, validate JSONL format

#### Search Not Working
- **Cause**: Large file sizes causing timeouts
- **Solution**: Implement search pagination (future enhancement)

#### Performance Issues
- **Cause**: Too many large conversation files
- **Solution**: Archive old conversations or implement lazy loading

### Debugging

#### Server Logs
```bash
# View server logs
npm start

# Enable debug logging
DEBUG=* npm start
```

#### Browser Console
- Open Developer Tools → Console
- Check for JavaScript errors
- Monitor network requests to API endpoints

## Contributing

### Code Structure
```
claude-viewer/
├── server.js              # Main server application
├── package.json          # Node.js dependencies
├── public/
│   ├── index.html        # Main HTML interface
│   ├── style.css         # Terminal-inspired styling
│   └── app.js            # Frontend JavaScript application
├── SPECS.md              # This specification document
└── README.md             # Usage instructions
```

### Development Guidelines
- **Code Style**: Use 2-space indentation, semicolons
- **Naming**: Use camelCase for JavaScript, kebab-case for CSS
- **Comments**: Document complex logic, avoid obvious comments
- **Testing**: Manual testing across different browsers
- **Performance**: Profile memory usage with large conversation sets

### Adding Features
1. Update this specification document
2. Implement server-side changes in `server.js`
3. Add corresponding frontend code in `app.js`
4. Update CSS styling in `style.css`
5. Test with various conversation file sizes and structures

## Conclusion

The Claude Code Project Viewer provides a lightweight, terminal-inspired interface for browsing Claude Code conversations. The ASCII aesthetic and compact layout optimize for information density while maintaining readability. The modular architecture allows for future enhancements while keeping the core functionality simple and performant.

The application successfully addresses the requirements for:
- ✅ Lightweight server implementation
- ✅ ASCII/terminal aesthetic design
- ✅ Compact, expandable conversation views
- ✅ Pretty-printed tool calls and code blocks
- ✅ Project browsing and search functionality
- ✅ Responsive, scroll-friendly interface

This specification serves as both documentation and development guide for maintaining and extending the Claude Code Project Viewer.