/**
 * Mulberry Team Chat UI
 *
 * 채널: #general / #dev / #research
 * Socket.IO 실 연결 — chat_join / chat_send / chat_message
 *
 * @author CTO Koda · DAY6 · 2026-06-19
 */

const CHAT_CHANNELS = ['general', 'dev', 'research'];

class ChatUI {
  constructor() {
    this.socket = null;
    this.currentChannel = 'general';
    this.passportId = null;
    this.name = null;
    this._messagesEl = null;
    this._inputEl = null;
    this._sendBtn = null;
    this._channelTabsEl = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._messagesEl   = document.getElementById('chat-messages');
    this._inputEl      = document.getElementById('chat-input');
    this._sendBtn      = document.getElementById('chat-send-btn');
    this._channelTabsEl = document.getElementById('chat-channel-tabs');

    if (!this._messagesEl || !this._inputEl) return;

    // 패스포트 정보 가져오기 (window.currentPassport가 있으면 사용)
    const passport = window.currentPassport || {};
    this.passportId = passport.passportId || 'guest-' + Math.random().toString(36).slice(2, 7);
    this.name = passport.name || this.passportId;

    this._renderChannelTabs();
    this._connectSocket();
    this._bindEvents();
  }

  _renderChannelTabs() {
    if (!this._channelTabsEl) return;
    this._channelTabsEl.innerHTML = '';
    CHAT_CHANNELS.forEach((ch) => {
      const btn = document.createElement('button');
      btn.textContent = '#' + ch;
      btn.dataset.channel = ch;
      btn.style.cssText = `
        padding:6px 14px; border:none; border-radius:20px; cursor:pointer;
        font-size:0.82rem; font-weight:600; margin-right:6px;
        background: ${ch === this.currentChannel ? '#7c3aed' : '#1a0f3a'};
        color: ${ch === this.currentChannel ? '#fff' : '#a78bfa'};
        transition: background 0.2s;
      `;
      btn.addEventListener('click', () => this._switchChannel(ch));
      this._channelTabsEl.appendChild(btn);
    });
  }

  _connectSocket() {
    if (typeof io === 'undefined') return;
    this.socket = io();

    this.socket.on('chat_history', ({ channel, messages }) => {
      if (channel !== this.currentChannel) return;
      this._clearMessages();
      messages.forEach((m) => this._renderMessage(m));
      this._scrollToBottom();
    });

    this.socket.on('chat_message', (msg) => {
      if (msg.channel !== this.currentChannel) return;
      this._renderMessage(msg);
      this._scrollToBottom();
    });

    this._joinChannel(this.currentChannel);
  }

  _joinChannel(channel) {
    if (!this.socket) return;
    this.socket.emit('chat_join', {
      channel,
      passportId: this.passportId,
      name: this.name,
    });
  }

  _switchChannel(channel) {
    if (channel === this.currentChannel) return;
    this.currentChannel = channel;
    this._renderChannelTabs();
    this._clearMessages();
    this._joinChannel(channel);
  }

  _bindEvents() {
    if (this._sendBtn) {
      this._sendBtn.addEventListener('click', () => this._sendMessage());
    }
    if (this._inputEl) {
      this._inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._sendMessage();
        }
      });
    }
  }

  _sendMessage() {
    if (!this._inputEl || !this.socket) return;
    const text = this._inputEl.value.trim();
    if (!text) return;

    this.socket.emit('chat_send', { channel: this.currentChannel, text });
    this._inputEl.value = '';
  }

  _renderMessage(msg) {
    if (!this._messagesEl) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display:flex; flex-direction:column; gap:2px;
      padding: ${msg.type === 'system' ? '4px 0' : '8px 0'};
      border-bottom: 1px solid rgba(255,255,255,0.05);
    `;

    if (msg.type === 'system') {
      const sysEl = document.createElement('div');
      sysEl.style.cssText = 'color:#6b7280; font-size:0.78rem; text-align:center;';
      sysEl.textContent = msg.text;
      wrap.appendChild(sysEl);
    } else {
      const headerEl = document.createElement('div');
      headerEl.style.cssText = 'display:flex; align-items:baseline; gap:8px;';

      const nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-weight:700; font-size:0.85rem; color:#a78bfa;';
      nameEl.textContent = msg.name;

      const tsEl = document.createElement('span');
      tsEl.style.cssText = 'font-size:0.72rem; color:#6b7280;';
      tsEl.textContent = new Date(msg.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      headerEl.appendChild(nameEl);
      headerEl.appendChild(tsEl);

      const bodyEl = document.createElement('div');
      bodyEl.style.cssText = 'color:#e2e8f0; font-size:0.88rem; line-height:1.5; word-break:break-word;';
      bodyEl.textContent = msg.text;

      wrap.appendChild(headerEl);
      wrap.appendChild(bodyEl);
    }

    this._messagesEl.appendChild(wrap);
  }

  _clearMessages() {
    if (this._messagesEl) this._messagesEl.innerHTML = '';
  }

  _scrollToBottom() {
    if (this._messagesEl) {
      this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
    }
  }
}

window.ChatUI = ChatUI;
