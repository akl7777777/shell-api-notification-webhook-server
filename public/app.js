class WebhookManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.ws = null;
        this.currentMessageId = null;
        this.loadingMessageDetail = false; // 防止重复请求

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadMessages();
        this.loadStats();
    }

    setupEventListeners() {
        // Filter and search
        document.getElementById('typeFilter').addEventListener('change', () => this.loadMessages(1));
        document.getElementById('searchInput').addEventListener('input', this.debounce(() => this.loadMessages(1), 500));
        document.getElementById('startDate').addEventListener('change', () => this.loadMessages(1));
        document.getElementById('endDate').addEventListener('change', () => this.loadMessages(1));
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());

        // Advanced search
        document.getElementById('advancedSearchBtn').addEventListener('click', () => this.toggleAdvancedSearch());
        document.getElementById('advancedSearchInput').addEventListener('input', this.debounce(() => this.performAdvancedSearch(), 500));

        // System monitoring
        document.getElementById('systemStatusBtn').addEventListener('click', () => this.toggleSystemStatus());
        document.getElementById('cleanupBtn').addEventListener('click', () => this.performCleanup());

        // Modal actions
        document.getElementById('markProcessedBtn').addEventListener('click', () => this.markAsProcessed());
        document.getElementById('deleteMessageBtn').addEventListener('click', () => this.deleteMessage());

        // Event delegation for message card buttons
        document.getElementById('messagesContainer').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.getAttribute('data-action');
            const messageId = button.getAttribute('data-message-id');

            switch (action) {
                case 'show-detail':
                    this.showMessageDetail(messageId);
                    break;
                case 'quick-mark-processed':
                    this.quickMarkProcessed(messageId);
                    break;
            }
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus('connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus('disconnected');
            // Reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('error');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'connection':
                console.log('Connected to webhook server:', data.clientId);
                break;
            case 'webhook_message':
                this.handleNewWebhookMessage(data.data);
                break;
            case 'pong':
                console.log('Pong received');
                break;
        }
    }

    handleNewWebhookMessage(message) {
        // Add new message to the top of the list if we're on the first page
        if (this.currentPage === 1) {
            this.prependMessage(message);
        }
        
        // Update stats
        this.loadStats();
        
        // Show notification
        this.showNotification(`新消息: ${message.title}`, 'success');
    }

    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        const alertEl = statusEl.querySelector('.alert');
        const realTimeStatus = document.getElementById('realTimeStatus');

        alertEl.className = 'alert alert-dismissible';

        switch (status) {
            case 'connected':
                alertEl.classList.add('alert-success');
                alertEl.innerHTML = '<i class="bi bi-wifi"></i> 已连接';
                setTimeout(() => statusEl.style.display = 'none', 3000);

                // Update header status badge
                if (realTimeStatus) {
                    realTimeStatus.className = 'badge bg-success';
                    realTimeStatus.innerHTML = '<i class="bi bi-wifi me-1"></i>已连接';
                }
                break;
            case 'disconnected':
                alertEl.classList.add('alert-warning');
                alertEl.innerHTML = '<i class="bi bi-wifi-off"></i> 连接断开，正在重连...';
                statusEl.style.display = 'block';

                // Update header status badge
                if (realTimeStatus) {
                    realTimeStatus.className = 'badge bg-warning';
                    realTimeStatus.innerHTML = '<i class="bi bi-wifi-off me-1"></i>重连中';
                }
                break;
            case 'error':
                alertEl.classList.add('alert-danger');
                alertEl.innerHTML = '<i class="bi bi-exclamation-triangle"></i> 连接错误';
                statusEl.style.display = 'block';

                // Update header status badge
                if (realTimeStatus) {
                    realTimeStatus.className = 'badge bg-danger';
                    realTimeStatus.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>错误';
                }
                break;
        }
    }

    async loadMessages(page = 1) {
        this.currentPage = page;
        this.setLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: this.pageSize.toString(),
            });
            
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchInput').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (type) params.append('type', type);
            if (search) params.append('search', search);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await fetch(`/api/webhooks?${params}`);
            const result = await response.json();
            
            if (result.success) {
                this.renderMessages(result.data.messages);
                this.renderPagination(result.data);
                document.getElementById('currentPage').textContent = result.data.page;
            } else {
                this.showNotification('加载消息失败', 'danger');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showNotification('加载消息失败', 'danger');
        } finally {
            this.setLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/webhooks/stats');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('totalMessages').textContent = result.data.total;
                document.getElementById('last24Hours').textContent = result.data.last24Hours;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox display-1 text-muted"></i>
                    <h3 class="text-muted">暂无消息</h3>
                    <p class="text-muted">等待 webhook 消息推送...</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = messages.map(message => this.createMessageCard(message)).join('');
    }

    createMessageCard(message) {
        const receivedAt = new Date(message.receivedAt).toLocaleString('zh-CN');
        const timestamp = new Date(message.timestamp * 1000).toLocaleString('zh-CN');
        const typeInfo = this.getTypeInfo(message.type);

        return `
            <div class="card message-card mb-4" data-message-id="${message.id}">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center flex-wrap gap-2">
                            <span class="badge type-badge ${typeInfo.class}">${typeInfo.icon} ${typeInfo.label}</span>
                            ${message.processed ?
                                '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>已处理</span>' :
                                '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>待处理</span>'
                            }
                            <span class="badge bg-light text-dark">
                                <i class="bi bi-hash me-1"></i>${message.id.substring(0, 8)}
                            </span>
                        </div>
                        <div class="timestamp">
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>${receivedAt}
                            </small>
                        </div>
                    </div>

                    <h5 class="card-title mb-3 fw-bold">${this.escapeHtml(message.title)}</h5>

                    <div class="message-content mb-3">
                        <p class="card-text text-muted mb-0">${this.escapeHtml(message.content)}</p>
                    </div>

                    ${message.values ? `
                        <div class="mb-3">
                            <small class="text-muted fw-semibold">附加数据:</small>
                            <div class="bg-light rounded p-2 mt-1">
                                <small class="font-monospace">${this.formatValues(message.values)}</small>
                            </div>
                        </div>
                    ` : ''}

                    <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                        <div class="d-flex align-items-center gap-3">
                            <small class="text-muted">
                                <i class="bi bi-calendar-event me-1"></i>原始时间: ${timestamp}
                            </small>
                            ${message.sourceIp ? `
                                <small class="text-muted">
                                    <i class="bi bi-geo-alt me-1"></i>${message.sourceIp}
                                </small>
                            ` : ''}
                            ${message.userAgent ? `
                                <small class="text-muted">
                                    <i class="bi bi-browser-chrome me-1"></i>${message.userAgent.substring(0, 20)}...
                                </small>
                            ` : ''}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" data-action="show-detail" data-message-id="${message.id}">
                                <i class="bi bi-eye me-1"></i>详情
                            </button>
                            ${!message.processed ? `
                                <button class="btn btn-sm btn-outline-success" data-action="quick-mark-processed" data-message-id="${message.id}">
                                    <i class="bi bi-check me-1"></i>标记已处理
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    prependMessage(message) {
        const container = document.getElementById('messagesContainer');
        const messageCard = this.createMessageCard(message);
        
        // Create a temporary div to hold the new message
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageCard;
        const newCard = tempDiv.firstElementChild;
        newCard.classList.add('new-message');
        
        // Insert at the beginning
        container.insertBefore(newCard, container.firstChild);
        
        // Remove the highlight class after animation
        setTimeout(() => {
            newCard.classList.remove('new-message');
        }, 2000);
    }

    renderPagination(data) {
        const pagination = document.getElementById('pagination');
        const { page, totalPages } = data;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="webhookManager.loadMessages(${page - 1})">上一页</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="webhookManager.loadMessages(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="webhookManager.loadMessages(${page + 1})">下一页</a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    async showMessageDetail(messageId) {
        // 防止重复请求
        if (this.loadingMessageDetail) {
            return;
        }

        this.loadingMessageDetail = true;

        try {
            const response = await fetch(`/api/webhooks/${messageId}`);
            const result = await response.json();

            if (result.success) {
                this.currentMessageId = messageId;
                this.renderMessageDetail(result.data);

                // Get or create modal instance
                const modalElement = document.getElementById('messageModal');
                let modal = bootstrap.Modal.getInstance(modalElement);
                if (!modal) {
                    modal = new bootstrap.Modal(modalElement);
                }
                modal.show();
            } else {
                this.showNotification('加载消息详情失败', 'danger');
            }
        } catch (error) {
            console.error('Error loading message detail:', error);
            this.showNotification('加载消息详情失败', 'danger');
        } finally {
            this.loadingMessageDetail = false;
        }
    }

    renderMessageDetail(message) {
        const modalBody = document.getElementById('messageModalBody');
        const receivedAt = new Date(message.receivedAt).toLocaleString('zh-CN');
        const timestamp = new Date(message.timestamp * 1000).toLocaleString('zh-CN');
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>基本信息</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>${message.id}</td></tr>
                        <tr><td><strong>类型:</strong></td><td><span class="badge ${this.getTypeBadgeClass(message.type)}">${this.getTypeLabel(message.type)}</span></td></tr>
                        <tr><td><strong>状态:</strong></td><td>${message.processed ? '<span class="badge bg-success">已处理</span>' : '<span class="badge bg-warning">未处理</span>'}</td></tr>
                        <tr><td><strong>标题:</strong></td><td>${this.escapeHtml(message.title)}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>时间信息</h6>
                    <table class="table table-sm">
                        <tr><td><strong>原始时间:</strong></td><td>${timestamp}</td></tr>
                        <tr><td><strong>接收时间:</strong></td><td>${receivedAt}</td></tr>
                        <tr><td><strong>来源IP:</strong></td><td>${message.sourceIp || '未知'}</td></tr>
                        <tr><td><strong>User Agent:</strong></td><td>${message.userAgent || '未知'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>消息内容</h6>
                    <div class="border rounded p-3 bg-light">
                        <pre class="mb-0">${this.escapeHtml(message.content)}</pre>
                    </div>
                </div>
            </div>
            ${message.values ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>原始数据</h6>
                    <div class="border rounded p-3 bg-light">
                        <pre class="mb-0">${JSON.stringify(message.values, null, 2)}</pre>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        // Update modal buttons
        const markProcessedBtn = document.getElementById('markProcessedBtn');
        markProcessedBtn.style.display = message.processed ? 'none' : 'inline-block';
    }

    async markAsProcessed() {
        if (!this.currentMessageId) return;
        
        try {
            const response = await fetch(`/api/webhooks/${this.currentMessageId}/processed`, {
                method: 'PUT'
            });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('消息已标记为已处理', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
                modal.hide();
                this.loadMessages(this.currentPage);
            } else {
                this.showNotification('标记失败', 'danger');
            }
        } catch (error) {
            console.error('Error marking as processed:', error);
            this.showNotification('标记失败', 'danger');
        }
    }

    async deleteMessage() {
        if (!this.currentMessageId) return;
        
        if (!confirm('确定要删除这条消息吗？此操作不可恢复。')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/webhooks/${this.currentMessageId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('消息已删除', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
                modal.hide();
                this.loadMessages(this.currentPage);
            } else {
                this.showNotification('删除失败', 'danger');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showNotification('删除失败', 'danger');
        }
    }

    refresh() {
        this.loadMessages(this.currentPage);
        this.loadStats();
    }

    setLoading(loading) {
        const refreshBtn = document.getElementById('refreshBtn');
        if (loading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    getTypeInfo(type) {
        const typeMap = {
            'quota_exceed': {
                class: 'badge-quota_exceed',
                icon: '⚠️',
                label: '额度超限'
            },
            'balance_low': {
                class: 'badge-warning',
                icon: '💰',
                label: '余额不足'
            },
            'channel_update': {
                class: 'badge-info',
                icon: '🔄',
                label: '渠道更新'
            },
            'channel_test': {
                class: 'badge-secondary',
                icon: '🧪',
                label: '渠道测试'
            },
            'security_alert': {
                class: 'badge-security_alert',
                icon: '🔒',
                label: '安全警报'
            },
            'system_announcement': {
                class: 'badge-primary',
                icon: '📢',
                label: '系统公告'
            },
            'test': {
                class: 'badge-test',
                icon: '🔧',
                label: '测试消息'
            }
        };

        return typeMap[type] || {
            class: 'badge-secondary',
            icon: '📝',
            label: type || '未知类型'
        };
    }

    getTypeBadgeClass(type) {
        return this.getTypeInfo(type).class;
    }

    getTypeLabel(type) {
        return this.getTypeInfo(type).label;
    }

    formatValues(values) {
        if (!values) return '';

        try {
            if (typeof values === 'string') {
                values = JSON.parse(values);
            }
            return JSON.stringify(values, null, 2);
        } catch (e) {
            return String(values);
        }
    }

    async quickMarkProcessed(messageId) {
        try {
            const response = await fetch(`/api/webhooks/${messageId}/processed`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('消息已标记为已处理', 'success');
                this.loadMessages(this.currentPage); // Refresh the list
            } else {
                this.showNotification('标记失败', 'danger');
            }
        } catch (error) {
            console.error('Error marking message as processed:', error);
            this.showNotification('标记失败', 'danger');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // 移除相同类型的现有通知，防止堆积
        const existingNotifications = document.querySelectorAll(`.alert-${type}.position-fixed`);
        existingNotifications.forEach(notification => {
            if (notification.textContent.trim().startsWith(message)) {
                notification.remove();
            }
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 80px; right: 20px; z-index: 1060; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Advanced search functionality
    toggleAdvancedSearch() {
        const advancedPanel = document.getElementById('advancedSearchPanel');
        const isVisible = advancedPanel.style.display !== 'none';
        advancedPanel.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            document.getElementById('advancedSearchInput').focus();
        }
    }

    async performAdvancedSearch() {
        const query = document.getElementById('advancedSearchInput').value.trim();
        if (!query) {
            this.loadMessages(1);
            return;
        }

        try {
            const params = new URLSearchParams({
                q: query,
                page: this.currentPage.toString(),
                pageSize: this.pageSize.toString()
            });

            const response = await fetch(`/api/webhooks/search?${params}`);
            const result = await response.json();

            if (result.success) {
                this.displayMessages(result.data.messages);
                this.updatePagination(result.data);
                this.showToast('Advanced search completed', 'success');
            } else {
                this.showToast('Search failed', 'error');
            }
        } catch (error) {
            console.error('Advanced search error:', error);
            this.showToast('Search error occurred', 'error');
        }
    }

    // System monitoring functionality
    toggleSystemStatus() {
        const statusPanel = document.getElementById('systemStatusPanel');
        const isVisible = statusPanel.style.display !== 'none';
        statusPanel.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            this.loadSystemStatus();
        }
    }

    async loadSystemStatus() {
        try {
            const [healthResponse, queueResponse] = await Promise.all([
                fetch('/api/storage/health'),
                fetch('/api/queue/stats')
            ]);

            const healthResult = await healthResponse.json();
            const queueResult = await queueResponse.json();

            this.displaySystemStatus(healthResult.data, queueResult.data);
        } catch (error) {
            console.error('Error loading system status:', error);
            this.showToast('Failed to load system status', 'error');
        }
    }

    displaySystemStatus(health, queue) {
        const statusContent = document.getElementById('systemStatusContent');

        const storageStatus = health.storage.healthy ?
            '<span class="badge bg-success">Healthy</span>' :
            '<span class="badge bg-danger">Unhealthy</span>';

        const queueStatus = queue.isActive ?
            '<span class="badge bg-success">Active</span>' :
            '<span class="badge bg-secondary">Inactive</span>';

        statusContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Storage Status</h6>
                    <p>Status: ${storageStatus}</p>
                    <p>Type: <code>${health.storage.type || 'Unknown'}</code></p>
                    <p>Initialized: ${health.initialized ? 'Yes' : 'No'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Queue Status</h6>
                    <p>Status: ${queueStatus}</p>
                    <p>Pending Jobs: ${queue.waiting || 0}</p>
                    <p>Active Jobs: ${queue.active || 0}</p>
                    <p>Completed: ${queue.completed || 0}</p>
                    <p>Failed: ${queue.failed || 0}</p>
                </div>
            </div>
        `;
    }

    async performCleanup() {
        const days = prompt('Enter number of days to keep (older messages will be deleted):', '30');
        if (!days || isNaN(days) || parseInt(days) < 1) {
            this.showToast('Invalid number of days', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete messages older than ${days} days?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/webhooks/cleanup?days=${days}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.showToast(`Cleaned up ${result.data.deletedCount} messages`, 'success');
                this.loadMessages(1);
                this.loadStats();
            } else {
                this.showToast('Cleanup failed', 'error');
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            this.showToast('Cleanup error occurred', 'error');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the webhook manager
const webhookManager = new WebhookManager();
