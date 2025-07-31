class ClaudeViewer {
    constructor() {
        this.currentProject = null;
        this.currentConversation = null;
        this.projects = [];
        this.conversations = [];
        
        // Message navigation state
        this.currentMessageIndex = -1;
        this.messageElements = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadLayoutPreferences();
        this.initialize();
    }
    
    async initialize() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        try {
            await this.loadProjects();
            await this.handleUrlChange();
        } catch (error) {
            console.error('Initialization error:', error);
            this.setStatus('Initialization failed');
        }
    }
    
    initializeElements() {
        this.projectsList = document.getElementById('projects-list');
        this.conversationsList = document.getElementById('conversations-list');
        this.conversationContent = document.getElementById('conversation-content');
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.statusText = document.getElementById('status-text');
        this.projectCount = document.getElementById('project-count');
        this.conversationCount = document.getElementById('conversation-count');
        this.currentTime = document.getElementById('current-time');
        
        // Pane elements
        this.sidebar = document.getElementById('sidebar');
        this.conversationsPanel = document.getElementById('conversations-panel');
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar');
        this.toggleConversationsBtn = document.getElementById('toggle-conversations');
        this.sidebarResize = document.getElementById('sidebar-resize');
        this.conversationResize = document.getElementById('conversation-resize');
        
        // Verify critical elements exist
        if (!this.sidebar || !this.conversationsPanel || !this.toggleSidebarBtn || !this.toggleConversationsBtn) {
            console.error('Critical UI elements not found!', {
                sidebar: !!this.sidebar,
                conversationsPanel: !!this.conversationsPanel,
                toggleSidebarBtn: !!this.toggleSidebarBtn,
                toggleConversationsBtn: !!this.toggleConversationsBtn
            });
        }
    }
    
    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        // Clear search on escape
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchInput.value = '';
                this.clearSearch();
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            this.handleUrlChange();
        });
        
        // Add vim-style keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Pane toggle events
        this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.toggleConversationsBtn.addEventListener('click', () => this.toggleConversations());
        
        // Resize handle events
        this.initializeResizeHandles();
    }
    
    initializeResizeHandles() {
        // Sidebar resize handle
        let isResizingSidebar = false;
        
        this.sidebarResize.addEventListener('mousedown', (e) => {
            isResizingSidebar = true;
            this.sidebarResize.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizingSidebar) return;
            
            const minWidth = 200;
            const maxWidth = 600;
            const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
            
            this.sidebar.style.width = newWidth + 'px';
            this.saveLayoutPreferences();
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizingSidebar) {
                isResizingSidebar = false;
                this.sidebarResize.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
        
        // Conversation panel resize handle
        let isResizingConversation = false;
        
        this.conversationResize.addEventListener('mousedown', (e) => {
            isResizingConversation = true;
            this.conversationResize.classList.add('dragging');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizingConversation) return;
            
            const mainContent = document.querySelector('.main-content');
            const rect = mainContent.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const totalHeight = rect.height;
            const minHeight = 100;
            const maxHeight = totalHeight - 100;
            
            const newHeight = Math.min(Math.max(relativeY, minHeight), maxHeight);
            const percentage = (newHeight / totalHeight) * 100;
            
            this.conversationsPanel.style.height = percentage + '%';
            this.saveLayoutPreferences();
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizingConversation) {
                isResizingConversation = false;
                this.conversationResize.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
    
    initializeKeyboardShortcuts() {
        this.selectedProjectIndex = -1;
        this.selectedConversationIndex = -1;
        this.detailPaneFocused = false;
        
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case 'j': // Next conversation
                    e.preventDefault();
                    this.navigateConversations(1);
                    break;
                case 'k': // Previous conversation
                    e.preventDefault();
                    this.navigateConversations(-1);
                    break;
                case 'h': // Previous project
                    e.preventDefault();
                    this.navigateProjects(-1);
                    break;
                case 'l': // Next project
                    e.preventDefault();
                    this.navigateProjects(1);
                    break;
                case 'arrowup': // Navigate to previous message
                    if (this.detailPaneFocused && this.currentConversation) {
                        e.preventDefault();
                        this.navigateToPreviousMessage();
                    }
                    break;
                case 'arrowdown': // Navigate to next message
                    if (this.detailPaneFocused && this.currentConversation) {
                        e.preventDefault();
                        this.navigateToNextMessage();
                    }
                    break;
                case 'g': // Go to first
                    if (e.shiftKey) { // G - go to last
                        e.preventDefault();
                        this.goToLast();
                    } else { // g - go to first
                        e.preventDefault();
                        this.goToFirst();
                    }
                    break;
                case 'enter':
                    e.preventDefault();
                    this.selectCurrentItem();
                    break;
                case '1': // Toggle sidebar
                    e.preventDefault();
                    this.toggleSidebar();
                    break;
                case '2': // Toggle conversations
                    e.preventDefault();
                    this.toggleConversations();
                    break;
                case '/': // Focus search
                    e.preventDefault();
                    this.searchInput.focus();
                    break;
                case 'escape':
                    e.preventDefault();
                    this.clearSelection();
                    break;
            }
        });
    }
    
    navigateProjects(direction) {
        if (this.projects.length === 0) return;
        
        // Start from current selection or current project
        let currentIndex = this.selectedProjectIndex;
        if (currentIndex === -1) {
            currentIndex = this.projects.findIndex(p => p.name === this.currentProject);
            if (currentIndex === -1) currentIndex = 0;
        }
        
        let newIndex = currentIndex + direction;
        
        // Clamp to bounds instead of wrapping
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this.projects.length) newIndex = this.projects.length - 1;
        
        this.selectedProjectIndex = newIndex;
        this.highlightProject(newIndex);
    }
    
    navigateConversations(direction) {
        if (!this.conversations || this.conversations.length === 0) {
            return;
        }
        
        // Start from current selection or current conversation
        let currentIndex = this.selectedConversationIndex;
        if (currentIndex === -1) {
            currentIndex = this.conversations.findIndex(c => c.filename === this.currentConversation);
            if (currentIndex === -1) currentIndex = 0;
        }
        
        let newIndex = currentIndex + direction;
        
        // Clamp to bounds instead of wrapping
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this.conversations.length) newIndex = this.conversations.length - 1;
        
        this.selectedConversationIndex = newIndex;
        this.highlightConversation(newIndex);
    }
    
    highlightProject(index) {
        const items = this.projectsList.querySelectorAll('.project-item');
        items.forEach((item, i) => {
            item.classList.toggle('keyboard-selected', i === index);
        });
        if (items[index]) {
            items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    highlightConversation(index) {
        const items = this.conversationsList.querySelectorAll('.conversation-item');
        items.forEach((item, i) => {
            item.classList.toggle('keyboard-selected', i === index);
        });
        if (items[index]) {
            items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    selectCurrentItem() {
        // Priority 1: If we have a conversation selected, activate it
        if (this.selectedConversationIndex >= 0 && this.conversations && this.conversations[this.selectedConversationIndex]) {
            this.selectConversation(this.conversations[this.selectedConversationIndex].filename);
            return;
        }
        
        // Priority 2: If we have a project selected, activate it
        if (this.selectedProjectIndex >= 0 && this.projects && this.projects[this.selectedProjectIndex]) {
            this.selectProject(this.projects[this.selectedProjectIndex].name);
            return;
        }
        
        // Priority 3: If no keyboard selection but we have conversations loaded, select first conversation
        if (!this.currentConversation && this.conversations && this.conversations.length > 0) {
            this.selectedConversationIndex = 0;
            this.highlightConversation(0);
            this.selectConversation(this.conversations[0].filename);
            return;
        }
        
        // Priority 4: If no keyboard selection but we have projects loaded, select first project
        if (!this.currentProject && this.projects && this.projects.length > 0) {
            this.selectedProjectIndex = 0;
            this.highlightProject(0);
            this.selectProject(this.projects[0].name);
            return;
        }
    }
    
    goToFirst() {
        if (this.conversations.length > 0) {
            this.selectedConversationIndex = 0;
            this.highlightConversation(0);
        } else if (this.projects.length > 0) {
            this.selectedProjectIndex = 0;
            this.highlightProject(0);
        }
    }
    
    goToLast() {
        if (this.conversations.length > 0) {
            this.selectedConversationIndex = this.conversations.length - 1;
            this.highlightConversation(this.conversations.length - 1);
        } else if (this.projects.length > 0) {
            this.selectedProjectIndex = this.projects.length - 1;
            this.highlightProject(this.projects.length - 1);
        }
    }
    
    clearSelection() {
        this.selectedProjectIndex = -1;
        this.selectedConversationIndex = -1;
        this.detailPaneFocused = false;
        document.querySelectorAll('.keyboard-selected').forEach(item => {
            item.classList.remove('keyboard-selected');
        });
    }
    
    scrollDetailPane(amount) {
        const detailPane = document.getElementById('conversation-detail');
        if (detailPane) {
            detailPane.scrollTop += amount;
        }
    }
    
    navigateToNextMessage() {
        if (this.messageElements.length === 0) return;
        
        // Remove current selection
        if (this.currentMessageIndex >= 0 && this.currentMessageIndex < this.messageElements.length) {
            this.messageElements[this.currentMessageIndex].classList.remove('message-selected');
        }
        
        // Move to next message (with wrapping)
        this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messageElements.length;
        
        // Add selection to new message
        const newMessage = this.messageElements[this.currentMessageIndex];
        newMessage.classList.add('message-selected');
        newMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    navigateToPreviousMessage() {
        if (this.messageElements.length === 0) return;
        
        // Remove current selection
        if (this.currentMessageIndex >= 0 && this.currentMessageIndex < this.messageElements.length) {
            this.messageElements[this.currentMessageIndex].classList.remove('message-selected');
        }
        
        // Move to previous message (with wrapping)
        this.currentMessageIndex = this.currentMessageIndex <= 0 ? 
            this.messageElements.length - 1 : this.currentMessageIndex - 1;
        
        // Add selection to new message
        const newMessage = this.messageElements[this.currentMessageIndex];
        newMessage.classList.add('message-selected');
        newMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    initializeMessageNavigation() {
        // Get all message elements in the conversation
        this.messageElements = Array.from(this.conversationContent.querySelectorAll('.message'));
        
        // Reset selection state
        this.messageElements.forEach(msg => msg.classList.remove('message-selected'));
        
        // Start at first message if any exist
        if (this.messageElements.length > 0) {
            this.currentMessageIndex = 0;
            this.messageElements[0].classList.add('message-selected');
        } else {
            this.currentMessageIndex = -1;
        }
    }
    
    toggleSidebar() {
        try {
            console.log('Toggling sidebar...');
            const isHidden = this.sidebar.classList.contains('hidden');
            console.log('Sidebar currently hidden:', isHidden);
            
            if (isHidden) {
                this.sidebar.classList.remove('hidden');
                this.sidebarResize.style.display = 'block';
                this.toggleSidebarBtn.classList.remove('toggle-active');
                console.log('Showing sidebar');
            } else {
                this.sidebar.classList.add('hidden');
                this.sidebarResize.style.display = 'none';
                this.toggleSidebarBtn.classList.add('toggle-active');
                console.log('Hiding sidebar');
            }
            
            this.saveLayoutPreferences();
        } catch (error) {
            console.error('Error toggling sidebar:', error);
        }
    }
    
    toggleConversations() {
        try {
            console.log('Toggling conversations panel...');
            const isHidden = this.conversationsPanel.classList.contains('hidden');
            console.log('Conversations panel currently hidden:', isHidden);
            
            if (isHidden) {
                this.conversationsPanel.classList.remove('hidden');
                this.conversationResize.style.display = 'block';
                this.toggleConversationsBtn.classList.remove('toggle-active');
                console.log('Showing conversations panel');
            } else {
                this.conversationsPanel.classList.add('hidden');
                this.conversationResize.style.display = 'none';
                this.toggleConversationsBtn.classList.add('toggle-active');
                console.log('Hiding conversations panel');
            }
            
            this.saveLayoutPreferences();
        } catch (error) {
            console.error('Error toggling conversations panel:', error);
        }
    }
    
    initializeRouting() {
        // Handle initial URL routing
        this.handleUrlChange();
    }
    
    async handleUrlChange() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment);
        
        if (segments.length >= 1) {
            const projectUrlName = segments[0];
            const conversationUrlName = segments[1] || null;
            
            // Ensure projects are loaded before routing
            if (this.projects.length === 0) {
                try {
                    await this.loadProjects();
                } catch (error) {
                    console.error('Failed to load projects for routing:', error);
                    this.setStatus('Error loading projects');
                    return;
                }
            }
            
            await this.routeToProjectConversation(projectUrlName, conversationUrlName);
        }
    }
    
    async routeToProjectConversation(projectUrlName, conversationUrlName) {
        try {
            // Find project by URL name
            const project = this.projects.find(p => p.urlName === projectUrlName);
            if (!project) {
                console.error('Project not found:', projectUrlName);
                this.setStatus('Project not found');
                return;
            }
            
            // Select the project
            await this.selectProject(project.name, false); // false = don't update URL
            
            if (conversationUrlName) {
                // Find conversation by URL name
                const conversation = this.conversations.find(c => c.urlName === conversationUrlName);
                if (conversation) {
                    await this.selectConversation(conversation.filename, false); // false = don't update URL
                } else {
                    console.error('Conversation not found:', conversationUrlName);
                    this.setStatus('Conversation not found');
                }
            }
        } catch (error) {
            console.error('Routing error:', error);
            this.setStatus('Error loading from URL');
        }
    }
    
    updateUrl(projectUrlName = null, conversationUrlName = null) {
        let newPath = '/';
        
        if (projectUrlName) {
            newPath = `/${projectUrlName}`;
            if (conversationUrlName) {
                newPath += `/${conversationUrlName}`;
            }
        }
        
        if (window.location.pathname !== newPath) {
            window.history.pushState(null, '', newPath);
        }
    }
    
    async loadProjects() {
        try {
            this.setStatus('Loading projects...');
            const response = await fetch('/api/projects');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.projects = await response.json();
            this.renderProjects();
            this.updateProjectCount();
            this.setStatus('Ready');
            
            return this.projects;
        } catch (error) {
            console.error('Error loading projects:', error);
            this.setStatus('Error loading projects');
            throw error;
        }
    }
    
    renderProjects() {
        if (this.projects.length === 0) {
            this.projectsList.innerHTML = `
                <div class="help-text">
                    No Claude Code projects found<br><br>
                    Projects should be in:<br>
                    ~/.claude/projects/
                </div>
            `;
            return;
        }
        
        this.projectsList.innerHTML = this.projects.map(project => {
            const stats = project.stats || { totalMessages: 0, assistantMessages: 0, userMessages: 0 };
            const statsText = `(${stats.totalMessages}/${stats.assistantMessages}/${stats.userMessages})`;
            
            return `
                <div class="project-item" data-project="${this.escapeHtml(project.name)}" role="listitem" tabindex="0">
                    <div class="project-name">${this.escapeHtml(project.projectName || project.displayName)}</div>
                    <div class="project-stats">${statsText}</div>
                    <div class="project-path">${this.escapeHtml(project.displayName)}</div>
                </div>
            `;
        }).join('');
        
        // Bind click and keyboard events
        this.projectsList.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', () => this.selectProject(item.dataset.project));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectProject(item.dataset.project);
                }
            });
        });
    }
    
    async selectProject(projectName, updateUrl = true) {
        // Update UI
        this.projectsList.querySelectorAll('.project-item').forEach(item => {
            item.classList.toggle('active', item.dataset.project === projectName);
        });
        
        this.currentProject = projectName;
        this.currentConversation = null;
        
        try {
            this.setStatus('Loading conversations...');
            const response = await fetch(`/api/projects/${encodeURIComponent(projectName)}/conversations`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.conversations = await response.json();
            this.renderConversations();
            this.updateConversationCount();
            this.setStatus('Ready');
            
            // Clear conversation detail
            this.conversationContent.innerHTML = '<div class="help-text">Select a conversation to view details</div>';
            
            // Reset message navigation state
            this.currentMessageIndex = -1;
            this.messageElements = [];
            
            // Update URL if needed
            if (updateUrl) {
                const project = this.projects.find(p => p.name === projectName);
                if (project) {
                    this.updateUrl(project.urlName);
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.setStatus('Error loading conversations');
            throw error;
        }
    }
    
    renderConversations() {
        if (this.conversations.length === 0) {
            this.conversationsList.innerHTML = `
                <div class="help-text">No conversations found in this project</div>
            `;
            return;
        }
        
        this.conversationsList.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item" data-filename="${this.escapeHtml(conv.filename)}" role="listitem" tabindex="0">
                <div class="conversation-id">${this.truncateText(this.escapeHtml(conv.sessionId), 25)}</div>
                <div class="conversation-meta">
                    <span>${this.formatDate(conv.timestamp)}</span>
                    <span>${this.formatBytes(conv.size)}</span>
                </div>
                ${conv.cwd ? `<div class="conversation-meta"><span>📁 ${this.truncateText(this.escapeHtml(conv.cwd), 40)}</span></div>` : ''}
                ${conv.gitBranch ? `<div class="conversation-meta"><span>🌿 ${this.escapeHtml(conv.gitBranch)}</span></div>` : ''}
            </div>
        `).join('');
        
        // Bind click and keyboard events
        this.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => this.selectConversation(item.dataset.filename));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectConversation(item.dataset.filename);
                }
            });
        });
    }
    
    async selectConversation(filename, updateUrl = true) {
        // Update UI
        this.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filename === filename);
        });
        
        this.currentConversation = filename;
        
        try {
            this.setStatus('Loading conversation...');
            const response = await fetch(`/api/projects/${encodeURIComponent(this.currentProject)}/conversations/${encodeURIComponent(filename)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const conversation = await response.json();
            this.renderConversation(conversation);
            this.setStatus('Ready');
            
            // Focus the detail pane for arrow key scrolling
            this.detailPaneFocused = true;
            
            // Update URL if needed
            if (updateUrl) {
                const project = this.projects.find(p => p.name === this.currentProject);
                const conv = this.conversations.find(c => c.filename === filename);
                if (project && conv) {
                    this.updateUrl(project.urlName, conv.urlName);
                }
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
            this.setStatus('Error loading conversation');
            throw error;
        }
    }
    
    renderConversation(conversation) {
        const messages = conversation.messages || [];
        
        if (messages.length === 0) {
            this.conversationContent.innerHTML = '<div class="help-text">No messages in this conversation</div>';
            return;
        }
        
        try {
            this.conversationContent.innerHTML = `
                <div class="conversation-header">
                    <strong>Session:</strong> ${this.escapeHtml(conversation.filename.replace('.jsonl', ''))}<br>
                    <strong>Messages:</strong> ${conversation.messageCount}
                </div>
                ${messages.map((msg, index) => {
                    try {
                        return this.renderMessage(msg, index);
                    } catch (error) {
                        console.error(`Error rendering message ${index}:`, error);
                        return `<div class="message error">Error rendering message ${index + 1}</div>`;
                    }
                }).join('')}
            `;
            
            // Initialize syntax highlighting and expandable sections
            this.initializeCodeHighlighting();
            this.initializeExpandables();
            
            // Initialize message navigation
            this.initializeMessageNavigation();
        } catch (error) {
            console.error('Error rendering conversation:', error);
            this.conversationContent.innerHTML = '<div class="help-text error">Error loading conversation content</div>';
            this.setStatus('Error rendering conversation');
        }
    }
    
    renderMessage(message, index) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const messageType = message.type || 'unknown';
        
        let content = '';
        
        if (message.message) {
            if (message.message.content) {
                if (typeof message.message.content === 'string') {
                    content = this.renderTextContent(message.message.content);
                } else if (Array.isArray(message.message.content)) {
                    content = message.message.content.map(item => this.renderContentItem(item)).join('');
                }
            }
        } else if (message.toolUseResult) {
            content = this.renderToolResult(message.toolUseResult);
        }
        
        return `
            <div class="message" data-index="${index}">
                <div class="message-header">
                    <span class="message-type ${messageType}">${messageType}</span>
                    <span class="message-timestamp">${timestamp}</span>
                </div>
                <div class="message-content">
                    ${content}
                    ${this.renderMessageMeta(message)}
                </div>
            </div>
        `;
    }
    
    renderContentItem(item) {
        switch (item.type) {
            case 'text':
                return this.renderTextContent(item.text);
            case 'thinking':
                return this.renderThinkingBlock(item.thinking);
            case 'tool_use':
                return this.renderToolUse(item);
            case 'tool_result':
                return this.renderToolResult(item.content);
            default:
                return `<div class="code-block">${this.escapeHtml(JSON.stringify(item, null, 2))}</div>`;
        }
    }
    
    renderTextContent(text) {
        // Simple markdown-like processing
        return text
            .replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
                return `<div class="code-block"><pre><code class="${lang || ''}">${this.escapeHtml(code)}</code></pre></div>`;
            })
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
    
    renderThinkingBlock(thinking) {
        return `
            <div class="thinking-block">
                <div class="thinking-header">🤔 Internal Reasoning</div>
                <div class="expandable">
                    Click to expand thinking process
                </div>
                <div class="collapsible-content">
                    ${this.renderTextContent(thinking)}
                </div>
            </div>
        `;
    }
    
    renderToolUse(toolUse) {
        return `
            <div class="tool-use">
                <div class="tool-header">
                    🔧 Tool: ${toolUse.name} (${toolUse.id})
                </div>
                <div class="tool-content">
                    <div class="expandable">
                        Input Parameters
                    </div>
                    <div class="collapsible-content">
                        <pre><code class="json">${this.escapeHtml(JSON.stringify(toolUse.input, null, 2))}</code></pre>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderToolResult(result) {
        return `
            <div class="tool-use">
                <div class="tool-header">⚡ Tool Result</div>
                <div class="tool-content">
                    <div class="expandable">
                        Output
                    </div>
                    <div class="collapsible-content">
                        <pre><code>${this.escapeHtml(result)}</code></pre>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderMessageMeta(message) {
        const meta = [];
        if (message.cwd) meta.push(`📁 ${message.cwd}`);
        if (message.gitBranch) meta.push(`🌿 ${message.gitBranch}`);
        if (message.version) meta.push(`v${message.version}`);
        
        return meta.length > 0 ? `<div class="message-meta">${meta.join(' • ')}</div>` : '';
    }
    
    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query || query.length > 200) {
            if (query.length > 200) {
                this.setStatus('Search query too long');
            }
            return;
        }
        
        try {
            this.setStatus('Searching...');
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.renderSearchResults(data.results, query);
            this.setStatus(`Found ${data.results.length} results`);
        } catch (error) {
            console.error('Search error:', error);
            this.setStatus('Search failed');
        }
    }
    
    renderSearchResults(results, query) {
        if (results.length === 0) {
            this.conversationContent.innerHTML = `
                <div class="help-text">No results found for: "${this.escapeHtml(query)}"</div>
            `;
            return;
        }
        
        this.conversationContent.innerHTML = `
            <div class="search-results-header">
                <h3>Search Results for: "${this.escapeHtml(query)}"</h3>
                <p>Found ${results.length} matches</p>
            </div>
            <div class="search-results">
                ${results.map((result, index) => `
                    <div class="search-result" data-project="${this.escapeHtml(result.projectName)}" data-filename="${this.escapeHtml(result.filename)}" data-index="${index}">
                        <div class="search-result-header">
                            <strong>${this.escapeHtml(result.project)}</strong> → ${this.escapeHtml(result.conversation)}
                        </div>
                        <div class="search-result-preview">
                            ${this.highlightSearchTerm(this.escapeHtml(result.preview), this.escapeHtml(query))}
                        </div>
                        <div class="search-result-meta">
                            ${this.formatDate(result.timestamp)} • ${this.escapeHtml(result.type)} • Line ${result.lineNumber}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click and keyboard event listeners safely
        this.conversationContent.querySelectorAll('.search-result').forEach(element => {
            // Make focusable
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
            
            // Click handler
            element.addEventListener('click', () => {
                const projectName = element.dataset.project;
                const filename = element.dataset.filename;
                this.loadSearchResult(projectName, filename);
            });
            
            // Keyboard handler
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const projectName = element.dataset.project;
                    const filename = element.dataset.filename;
                    this.loadSearchResult(projectName, filename);
                }
            });
        });
    }
    
    async loadSearchResult(projectName, filename) {
        await this.selectProject(projectName);
        await this.selectConversation(filename);
    }
    
    clearSearch() {
        if (this.currentConversation) {
            this.selectConversation(this.currentConversation);
        } else {
            this.conversationContent.innerHTML = '<div class="help-text">Select a conversation to view details</div>';
        }
    }
    
    initializeCodeHighlighting() {
        try {
            document.querySelectorAll('pre code').forEach(block => {
                // Ensure content is safely escaped before highlighting
                const originalContent = block.textContent || block.innerText || '';
                block.textContent = originalContent; // This ensures any HTML is escaped
                
                // Check if hljs is available
                if (typeof hljs !== 'undefined' && hljs.highlightElement) {
                    hljs.highlightElement(block);
                } else {
                    console.warn('Syntax highlighting unavailable');
                }
            });
        } catch (error) {
            console.error('Error initializing code highlighting:', error);
        }
    }
    
    initializeExpandables() {
        try {
            document.querySelectorAll('.expandable').forEach(element => {
                // Remove any existing listeners to prevent duplicates
                element.replaceWith(element.cloneNode(true));
            });
            
            // Re-select elements after cloning
            document.querySelectorAll('.expandable').forEach(element => {
                element.addEventListener('click', function() {
                    try {
                        this.classList.toggle('expanded');
                        const content = this.nextElementSibling;
                        if (content && content.classList.contains('collapsible-content')) {
                            content.classList.toggle('expanded');
                        }
                    } catch (error) {
                        console.error('Error toggling expandable:', error);
                    }
                });
                
                // Add keyboard support
                element.setAttribute('tabindex', '0');
                element.setAttribute('role', 'button');
                element.setAttribute('aria-expanded', 'false');
                
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            });
        } catch (error) {
            console.error('Error initializing expandables:', error);
        }
    }
    
    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(unsafe) {
        if (unsafe == null || unsafe === undefined) {
            return '';
        }
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    highlightSearchTerm(text, term) {
        // Escape regex special characters to prevent ReDoS attacks
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<span class="search-match">$1</span>');
    }
    
    setStatus(status) {
        this.statusText.textContent = status;
    }
    
    updateProjectCount() {
        this.projectCount.textContent = `${this.projects.length} projects`;
    }
    
    updateConversationCount() {
        this.conversationCount.textContent = `${this.conversations.length} conversations`;
    }
    
    updateTime() {
        this.currentTime.textContent = new Date().toLocaleTimeString();
    }
    
    // Layout preferences management
    saveLayoutPreferences() {
        const preferences = {
            sidebarWidth: this.sidebar.style.width || '300px',
            sidebarHidden: this.sidebar.classList.contains('hidden'),
            conversationsPanelHeight: this.conversationsPanel.style.height || '40%',
            conversationsPanelHidden: this.conversationsPanel.classList.contains('hidden')
        };
        
        localStorage.setItem('claude-viewer-layout', JSON.stringify(preferences));
    }
    
    loadLayoutPreferences() {
        try {
            const saved = localStorage.getItem('claude-viewer-layout');
            if (!saved) return;
            
            const preferences = JSON.parse(saved);
            
            // Apply sidebar preferences
            if (preferences.sidebarWidth) {
                this.sidebar.style.width = preferences.sidebarWidth;
            }
            
            if (preferences.sidebarHidden) {
                this.sidebar.classList.add('hidden');
                this.sidebarResize.style.display = 'none';
                this.toggleSidebarBtn.classList.add('toggle-active');
            }
            
            // Apply conversations panel preferences
            if (preferences.conversationsPanelHeight) {
                this.conversationsPanel.style.height = preferences.conversationsPanelHeight;
            }
            
            if (preferences.conversationsPanelHidden) {
                this.conversationsPanel.classList.add('hidden');
                this.conversationResize.style.display = 'none';
                this.toggleConversationsBtn.classList.add('toggle-active');
            }
        } catch (error) {
            console.error('Error loading layout preferences:', error);
        }
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ClaudeViewer();
    window.app = app; // Make app globally accessible
});