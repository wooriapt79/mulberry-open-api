/**
 * Team Chat Frontend
 * 
 * Socket.IO 실시간 채팅 + Channel 관리
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

const CHAT_API_BASE = window.location.origin;
const SOCKET_URL = CHAT_API_BASE;

class TeamChat {
  constructor() {
    this.socket = null;
    this.currentChannelId = null;
    this.currentUserId = null;
    this.messages = [];
    this.channels = [];
  }
  
  async init() {
    console.log('🚀 Initializing Team Chat...');
    
    const token = localStorage.getItem('mulberry_token');
    if (!token) {
      this.showError('Please login first');
      return;
    }
    
    this.socket = io(SOCKET_URL, {
      auth: { token: token }
    });
    
    this.setupSocketListeners();
    await this.loadChannels();
    await this.loadUserInfo();
    
    console.log('✅ Team Chat initialized');
  }
  
  setupSocketListeners() {
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
    });
    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
    });
    this.socket.on('new-message', (message) => {
      this.appendMessage(message);
      this.scrollToBottom();
    });
    this.socket.on('user-typing', ({ userId, isTyping }) => {
      this.showTypingIndicator(userId, isTyping);
    });
  }
  
  async loadChannels() {
    try {
      const response = await fetch(CHAT_API_BASE + '/api/channels', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') }
      });
      const data = await response.json();
      this.channels = data.channels || [];
      this.renderChannelList();
      if (this.channels.length > 0 && !this.currentChannelId) {
        this.selectChannel(this.channels[0]._id);
      }
    } catch (e) { console.error(e); }
  }
  
  async loadUserInfo() {
    try {
      const response = await fetch(CHAT_API_BASE + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') }
      });
      const data = await response.json();
      this.currentUserId = data.userId;
    } catch (e) { console.error(e); }
  }
  
  renderChannelList() {
    const container = document.getElementById('channel-list');
    if (!container) return;
    let html = '';
    this.channels.forEach(channel => {
      const isActive = channel._id === this.currentChannelId;
      html += '<div class="channel-item ' + (isActive ? 'active' : '') + '" onclick="teamChat.selectChannel(\'' + channel._id + '\')">';
      html += '<div class="channel-name">' + channel.name + '</div></div>';
    });
    container.innerHTML = html;
  }
  
  async selectChannel(channelId) {
    if (this.currentChannelId) {
      this.socket.emit('leave-channel', { channelId: this.currentChannelId, userId: this.currentUserId });
    }
    this.currentChannelId = channelId;
    this.socket.emit('join-channel', { channelId, userId: this.currentUserId });
    this.renderChannelList();
    await this.loadMessages(channelId);
  }
  
  async loadMessages(channelId) {
    try {
      const response = await fetch(CHAT_API_BASE + '/api/chat/messages/' + channelId, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') }
      });
      const data = await response.json();
      this.messages = data.messages || [];
      this.renderMessages();
      this.scrollToBottom();
    } catch (e) { console.error(e); }
  }
  
  renderMessages() {
    const container = document.getElementById('message-list');
    if (!container) return;
    let html = '';
    this.messages.forEach(message => {
      const isOwn = message.sender && message.sender._id === this.currentUserId;
      html += '<div class="message ' + (isOwn ? 'message-own' : 'message-other') + '">';
      html += '<div class="message-text">' + this.escapeHtml(message.content) + '</div></div>';
    });
    container.innerHTML = html;
  }
  
  appendMessage(message) {
    this.messages.push(message);
    const container = document.getElementById('message-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'message';
    div.textContent = message.content;
    container.appendChild(div);
  }
  
  async sendMessage() {
    const input = document.getElementById('message-input');
    if (!input) return;
    const content = input.value.trim();
    if (!content || !this.currentChannelId) return;
    try {
      await fetch(CHAT_API_BASE + '/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') },
        body: JSON.stringify({ channelId: this.currentChannelId, content })
      });
      input.value = '';
    } catch (e) { console.error(e); }
  }
  
  handleTyping() {
    if (!this.currentChannelId) return;
    this.socket.emit('typing-start', { channelId: this.currentChannelId, userId: this.currentUserId });
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('typing-stop', { channelId: this.currentChannelId, userId: this.currentUserId });
    }, 1000);
  }
  
  showTypingIndicator(userId, isTyping) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    if (isTyping && userId !== this.currentUserId) {
      indicator.textContent = 'Someone is typing...';
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }
  
  showSystemMessage(text) {
    const container = document.getElementById('message-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'system-message';
    div.textContent = text;
    container.appendChild(div);
  }
  
  scrollToBottom() {
    const container = document.getElementById('message-list');
    if (container) container.scrollTop = container.scrollHeight;
  }
  
  updateConnectionStatus(connected) {
    const status = document.getElementById('connection-status');
    if (status) {
      status.textContent = connected ? 'Connected' : 'Disconnected';
      status.className = connected ? 'status-connected' : 'status-disconnected';
    }
  }
  
  showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
    }
  }
  
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const teamChat = new TeamChat();
document.addEventListener('DOMContentLoaded', () => {
  teamChat.init();
  const input = document.getElementById('message-input');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); teamChat.sendMessage(); }
    });
  }
  const sendButton = document.getElementById('send-button');
  if (sendButton) sendButton.addEventListener('click', () => { teamChat.sendMessage(); });
});
window.teamChat = teamChat;
