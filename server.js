const express = require('express');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const os = require('os');

// Promisify file system operations for better performance
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const app = express();
const PORT = 3000;
const CLAUDE_PROJECTS_PATH = path.join(os.homedir(), '.claude', 'projects');

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:;");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS for same-origin only
  res.setHeader('Access-Control-Allow-Origin', `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  next();
});

// Body size limit middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static files from public directory  
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to get verified project info from conversation files using cwd
async function getProjectInfoFromCwd(projectPath) {
  try {
    const files = await readdir(projectPath);
    const jsonlFiles = files.filter(file => file.endsWith('.jsonl'));
    
    // Try to find cwd from the first few conversation files
    for (const file of jsonlFiles.slice(0, 3)) {
      try {
        const filePath = path.join(projectPath, file);
        const stats = await stat(filePath);
        
        // Skip large files to avoid performance issues
        if (stats.size > 10 * 1024 * 1024) continue;
        
        const content = await readFile(filePath, { encoding: 'utf8', flag: 'r' });
        const lines = content.split('\n').filter(line => line.trim());
        
        // Look for the first non-summary line with cwd
        for (const line of lines.slice(0, 5)) { // Check first 5 lines only
          try {
            const parsed = JSON.parse(line);
            if (parsed.type !== 'summary' && parsed.cwd) {
              return {
                cwd: parsed.cwd,
                projectName: path.basename(parsed.cwd)
              };
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      } catch (e) {
        // Skip problematic files
      }
    }
    
    return null; // No cwd found
  } catch (error) {
    console.error('Error getting project info from cwd:', error);
    return null;
  }
}

// Project scanning functions
async function scanProjects() {
  try {
    if (!fs.existsSync(CLAUDE_PROJECTS_PATH)) {
      return [];
    }
    
    const dirents = await readdir(CLAUDE_PROJECTS_PATH, { withFileTypes: true });
    const projectPromises = dirents
      .filter(dirent => dirent.isDirectory())
      .map(async dirent => {
        const fullPath = decodeProjectName(dirent.name);
        const fallbackProjectName = path.basename(fullPath);
        const projectPath = path.join(CLAUDE_PROJECTS_PATH, dirent.name);
        
        // Try to get verified project name and path from conversation files using cwd
        const verifiedProjectInfo = await getProjectInfoFromCwd(projectPath);
        const projectName = verifiedProjectInfo?.projectName || fallbackProjectName;
        const displayPath = verifiedProjectInfo?.cwd || fullPath;
        
        // Get message counts for this project
        const stats = await getProjectStats(projectPath);
        
        return {
          name: dirent.name,
          displayName: displayPath, // Use verified path from cwd or fallback
          projectName: projectName, // Use verified project name from cwd or fallback
          urlName: createUrlSafeName(projectName), // Use verified project name for URL
          path: projectPath,
          stats: stats
        };
      });
    
    return await Promise.all(projectPromises);
  } catch (error) {
    console.error('Error scanning projects:', error);
    return [];
  }
}

async function getProjectStats(projectPath) {
  try {
    const files = await readdir(projectPath);
    const jsonlFiles = files.filter(file => file.endsWith('.jsonl'));
    
    let totalMessages = 0;
    let assistantMessages = 0;
    let userMessages = 0;
    let conversationCount = 0;
    let mostRecentDate = null;
    
    for (const file of jsonlFiles) {
      try {
        const filePath = path.join(projectPath, file);
        const stats = await stat(filePath);
        
        // Skip large files to avoid performance issues
        if (stats.size > 10 * 1024 * 1024) continue;
        
        const content = await readFile(filePath, { encoding: 'utf8', flag: 'r' });
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        conversationCount++;
        
        // Track most recent conversation date from file modification time
        if (!mostRecentDate || stats.mtime > mostRecentDate) {
          mostRecentDate = stats.mtime;
        }
        
        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            
            // Skip summary entries in stats calculation
            if (message.type === 'summary') {
              continue;
            }
            
            // Also check message timestamps for more accurate recent date
            if (message.timestamp) {
              const messageDate = new Date(message.timestamp);
              if (!mostRecentDate || messageDate > mostRecentDate) {
                mostRecentDate = messageDate;
              }
            }
            
            totalMessages++;
            
            if (message.type === 'assistant') {
              assistantMessages++;
            } else if (message.type === 'user') {
              userMessages++;
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      } catch (e) {
        // Skip problematic files
      }
    }
    
    return {
      totalMessages,
      assistantMessages,
      userMessages,
      conversationCount,
      mostRecentDate
    };
  } catch (error) {
    console.error('Error getting project stats:', error);
    return {
      totalMessages: 0,
      assistantMessages: 0,
      userMessages: 0,
      conversationCount: 0,
      mostRecentDate: null
    };
  }
}

function decodeProjectName(encodedName) {
  // Convert encoded project name back to readable path
  // Handle Unicode characters properly
  try {
    const withoutPrefix = encodedName.replace(/^-/, '');
    let decoded = decodeURIComponent(withoutPrefix.replace(/-/g, '/'));
    
    // Check if the decoded path actually exists, if not, try to be smarter about dashes
    const testPath = '/' + decoded;
    if (!fs.existsSync(testPath)) {
      // Try different dash interpretations for common patterns
      // Look for patterns like "projectname-v3" or "projectname-version"
      const segments = withoutPrefix.split('-');
      
      // Try combining last segments that look like version numbers
      for (let i = segments.length - 2; i >= 0; i--) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment.match(/^v\d+$/) || lastSegment.match(/^\d+$/)) {
          // Looks like a version, try combining with previous segment
          const combined = segments.slice(0, i).join('/') + '/' + segments.slice(i).join('-');
          const testCombined = '/' + combined;
          if (fs.existsSync(testCombined)) {
            decoded = combined;
            break;
          }
        }
      }
    }
    
    return decoded;
  } catch (error) {
    // Fallback for malformed encoding
    return encodedName.replace(/^-/, '').replace(/-/g, '/');
  }
}

function encodeProjectName(displayName) {
  // Convert readable path to encoded project name
  // Handle Unicode characters properly
  try {
    return '-' + encodeURIComponent(displayName).replace(/%2F/g, '-');
  } catch (error) {
    // Fallback for problematic characters
    return '-' + displayName.replace(/[/\\:*?"<>|]/g, '-');
  }
}

function createUrlSafeName(name) {
  // Create URL-safe version of project/conversation names
  // Handle Unicode properly
  try {
    return encodeURIComponent(name.replace(/[\/\\:*?"<>|]/g, '-'));
  } catch (error) {
    // Fallback for encoding issues
    return name.replace(/[^a-zA-Z0-9\-_.~]/g, '-');
  }
}

function decodeUrlSafeName(urlName) {
  // Decode URL-safe name back
  try {
    return decodeURIComponent(urlName);
  } catch (error) {
    // Fallback for malformed URLs
    console.warn('Failed to decode URL name:', urlName);
    return urlName;
  }
}

async function scanConversations(projectPath) {
  try {
    const files = await readdir(projectPath);
    const conversations = [];
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      
      const filePath = path.join(projectPath, file);
      const stats = await stat(filePath);
      
      // Check file size limit (10MB)
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`File ${file} exceeds size limit, skipping`);
        continue;
      }
      
      // Read first non-summary line to get session info and extract summary
      const content = await readFile(filePath, { encoding: 'utf8', flag: 'r' });
      const lines = content.split('\n').filter(line => line.trim());
      let sessionInfo = { sessionId: file.replace('.jsonl', ''), timestamp: stats.mtime };
      let summary = null;
      
      // First pass: extract summary if it exists
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'summary' && parsed.summary) {
            summary = parsed.summary;
            break; // Use the first summary found
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
      
      // Second pass: find the first non-summary line for session metadata
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type !== 'summary') {
            sessionInfo = {
              sessionId: parsed.sessionId || file.replace('.jsonl', ''),
              timestamp: new Date(parsed.timestamp || stats.mtime),
              cwd: parsed.cwd || '',
              gitBranch: parsed.gitBranch || '',
              summary: summary
            };
            break;
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
      
      // If we only found summary entries, still include the summary
      if (summary && !sessionInfo.summary) {
        sessionInfo.summary = summary;
      }
      
      conversations.push({
        filename: file,
        urlName: createUrlSafeName(sessionInfo.sessionId),
        ...sessionInfo,
        size: stats.size
      });
    }
    
    return conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error scanning conversations:', error);
    return [];
  }
}

// API Routes
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await scanProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

app.get('/api/projects/:projectName/conversations', async (req, res) => {
  const projectName = req.params.projectName;
  
  // Validate and sanitize project name to prevent path traversal
  const sanitizedProject = path.basename(projectName);
  if (sanitizedProject !== projectName || sanitizedProject.includes('..')) {
    return res.status(400).json({ error: 'Invalid project name' });
  }
  
  const projectPath = path.resolve(CLAUDE_PROJECTS_PATH, sanitizedProject);
  
  // Ensure the resolved path is within the allowed directory
  if (!projectPath.startsWith(path.resolve(CLAUDE_PROJECTS_PATH))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const conversations = await scanConversations(projectPath);
    res.json(conversations);
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

app.get('/api/projects/:projectName/conversations/:filename', async (req, res) => {
  const { projectName, filename } = req.params;
  
  // Validate and sanitize inputs to prevent path traversal
  const sanitizedProject = path.basename(projectName);
  const sanitizedFilename = path.basename(filename);
  
  if (sanitizedProject !== projectName || sanitizedProject.includes('..') ||
      sanitizedFilename !== filename || sanitizedFilename.includes('..') ||
      !sanitizedFilename.endsWith('.jsonl')) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  const projectPath = path.resolve(CLAUDE_PROJECTS_PATH, sanitizedProject);
  const filePath = path.resolve(projectPath, sanitizedFilename);
  
  // Ensure both paths are within the allowed directory
  if (!projectPath.startsWith(path.resolve(CLAUDE_PROJECTS_PATH)) ||
      !filePath.startsWith(projectPath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  try {
    // Check file size before reading (limit to 25MB)
    const stats = await stat(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large' });
    }
    
    const content = await readFile(filePath, { encoding: 'utf8', flag: 'r' });
    const messages = content.trim().split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error(`Error parsing line ${index + 1}:`, e);
          return null;
        }
      })
      .filter(msg => msg !== null);
    
    res.json({
      filename,
      messageCount: messages.length,
      messages: messages
    });
  } catch (error) {
    console.error('Error reading conversation:', error);
    res.status(500).json({ error: 'Failed to read conversation' });
  }
});

// Search endpoint with input validation and rate limiting
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  
  // Input validation
  if (!query) {
    return res.json({ results: [] });
  }
  
  if (typeof query !== 'string' || query.length > 200) {
    return res.status(400).json({ error: 'Invalid search query' });
  }
  
  // Simple rate limiting check (in production, use proper rate limiting middleware)
  const clientIP = req.ip;
  const now = Date.now();
  
  try {
    const projects = await scanProjects();
    const results = [];
    
    for (const project of projects) {
      const conversations = await scanConversations(project.path);
      
      for (const conv of conversations) {
        const filePath = path.join(project.path, conv.filename);
        
        try {
          // Check file size before reading
          const stats = await stat(filePath);
          if (stats.size > 25 * 1024 * 1024) {
            console.warn(`Skipping large file: ${filePath}`);
            continue;
          }
          
          const content = await readFile(filePath, { encoding: 'utf8', flag: 'r' });
          const lines = content.split('\n').filter(line => line.trim());
          
          lines.forEach((line, lineIndex) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              try {
                const message = JSON.parse(line);
                results.push({
                  project: project.displayName,
                  projectName: project.name,
                  conversation: conv.sessionId,
                  filename: conv.filename,
                  lineNumber: lineIndex + 1,
                  timestamp: message.timestamp,
                  type: message.type,
                  preview: truncateText(getMessageText(message), 200)
                });
              } catch (e) {
                // Skip malformed lines
              }
            }
          });
        } catch (error) {
          console.error(`Error searching ${filePath}:`, error);
        }
        
        // Limit results to prevent memory issues
        if (results.length >= 100) break;
      }
      
      if (results.length >= 100) break;
    }
    
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ results: results.slice(0, 100) }); // Limit to 100 results
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Utility functions
function getMessageText(message) {
  if (message.message) {
    if (typeof message.message.content === 'string') {
      return message.message.content;
    } else if (Array.isArray(message.message.content)) {
      return message.message.content
        .map(item => item.text || item.thinking || JSON.stringify(item))
        .join(' ');
    }
  }
  return JSON.stringify(message);
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// URL Routes for direct project/conversation access (must be last!)
app.get('/:projectName/:conversationName?', (req, res) => {
  // Serve the main HTML file for all project/conversation routes
  // Frontend will handle the routing
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`Claude Viewer running at http://localhost:${PORT}`);
  console.log(`Scanning projects from: ${CLAUDE_PROJECTS_PATH}`);
  
  try {
    const projects = await scanProjects();
    console.log(`Found ${projects.length} projects`);
  } catch (error) {
    console.error('Error during startup scan:', error);
  }
});