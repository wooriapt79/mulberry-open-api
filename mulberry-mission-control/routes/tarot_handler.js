'use strict';
/**
 * tarot_handler.js
 * Luna 타로 뽑기 핸들러 v1.2
 * TRANG Manager — 2026-07-31
 * Fix: 이미지 URL 404 수정 → Wikimedia Commons Rider-Waite
 */

const fs   = require('fs');
const path = require('path');

// ── 앞면 이미지 (Wikimedia Commons — Rider-Waite, 퍼블릭 도메인) ──
const CARD_IMAGES = {
  0:  'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
  1:  'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
  2:  'https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg',
  3:  'https://upload.wikimedia.org/wikipedia/commons/d/d3/RWS_Tarot_03_Empress.jpg',
  4:  'https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg',
  5:  'https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg',
  6:  'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg',
  7:  'https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg',
  8:  'https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg',
  9:  'https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg',
  10: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
  11: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg',
  12: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
  13: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg',
  14: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg',
  15: 'https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg',
  16: 'https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg',
  17: 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg',
  18: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg',
  19: 'https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg',
  20: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg',
  21: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg',
};

// ── 카루셀 뒷면 이미지 (Mulberry 타로카드 비주얼 — Issue #130) ──
const CARD_BACK_URL = 'https://raw.githubusercontent.com/wooriapt79/mulberry_ecosystem_AgenticAI/main/assets/tarot/mulberry-carousel-800x400.jpg';

// ── 세션 상태 (메모리) ──
const tarotSessions = new Map();

// ── tarot_cards.json 로드 ──
let CARDS = [];
let INTERPRETATIONS = {};
try {
  const raw = fs.readFileSync(path.join(__dirname, '../data/tarot_cards.json'), 'utf8');
  const data = JSON.parse(raw);
  CARDS           = data.major          || [];
  INTERPRETATIONS = data.interpretations || {};
} catch (e) {
  console.error('[tarot_handler] tarot_cards.json 로드 실패:', e.message);
}

// ── 랜덤 카드 3장 ──
function pickCards() {
  return [...CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
}

// ── 카드 선택 화면 — basicCard 캐러셀 (Mulberry 뒷면 이미지) ──
function buildCardSelect(topic) {
  const cards = pickCards();
  return {
    version: '2.0',
    template: {
      outputs: [
        {
          carousel: {
            type: 'basicCard',
            items: cards.map((card, i) => ({
              thumbnail: { imageUrl: CARD_BACK_URL, fixedRatio: false },
              title: `${i + 1}번 카드`,
              description: '✨ 마음이 끌리는 카드를 선택하세요',
              buttons: [
                {
                  action:      'message',
                  label:       '이 카드 선택',
                  messageText: `tarot_card:${topic}:${card.id}`,
                },
              ],
            })),
          },
        },
      ],
    },
  };
}

// ── 카드 공개 화면 — basicCard (Wikimedia 앞면 이미지 + 해석) ──
function buildCardReveal(card, topic) {
  const imageUrl    = CARD_IMAGES[card.id] || CARD_IMAGES[0];
  const topicLabel  = { love: '💕 사랑', money: '💰 금전', career: '💼 커리어' }[topic] || '✨ 오늘';
  const reading     = (INTERPRETATIONS[topic] || {})[String(card.id)] || card.keyword;

  return {
    version: '2.0',
    template: {
      outputs: [
        {
          basicCard: {
            thumbnail: { imageUrl },
            title:       `${card.name} (${card.name_en})`,
            description: `🔮 ${topicLabel} 운세\n\n${reading}\n\n키워드: ${card.keyword}`,
            buttons: [
              {
                action:      'message',
                label:       '🃏 다시 뽑기',
                messageText: '타로',
              },
            ],
          },
        },
      ],
    },
  };
}

// ── 토픽 선택 화면 ──
function buildTopicSelect() {
  return {
    version: '2.0',
    template: {
      outputs: [
        { simpleText: { text: '오늘 어떤 주제로 카드를 뽑아볼까요?\n주제를 선택해주세요.' } },
      ],
      quickReplies: [
        { action: 'message', label: '💕 사랑',   messageText: 'tarot_topic:love'   },
        { action: 'message', label: '💰 금전',   messageText: 'tarot_topic:money'  },
        { action: 'message', label: '💼 커리어', messageText: 'tarot_topic:career' },
      ],
    },
  };
}

// ── 공개 API ──
function isTarotTrigger(utterance) {
  return /타로|오늘의 카드|카드 뽑|운세 카드/i.test(utterance);
}

function isInTarotSession(userKey) {
  return tarotSessions.has(userKey);
}

function handleTarot(utterance, userKey) {
  if (isTarotTrigger(utterance) && !utterance.startsWith('tarot_')) {
    tarotSessions.set(userKey, { step: 'topic' });
    return buildTopicSelect();
  }

  if (utterance.startsWith('tarot_topic:')) {
    const topic = utterance.replace('tarot_topic:', '').trim();
    tarotSessions.set(userKey, { step: 'select', topic });
    return buildCardSelect(topic);
  }

  if (utterance.startsWith('tarot_card:')) {
    const [, topic, cardIdStr] = utterance.split(':');
    const cardId = parseInt(cardIdStr, 10);
    const card   = CARDS.find(c => c.id === cardId);
    tarotSessions.delete(userKey);
    if (!card) return null;
    return buildCardReveal(card, topic);
  }

  return null;
}

module.exports = { handleTarot, isTarotTrigger, isInTarotSession };
