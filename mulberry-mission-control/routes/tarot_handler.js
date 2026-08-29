'use strict';
/**
 * tarot_handler.js — Luna 타로 뽑기 핸들러 v2.0
 * Issue #131: Event Adapter 구조 도입 (display_text / event_payload 분리)
 * Issue #130: Mulberry 타로카드 비주얼
 */

const fs   = require('fs');
const path = require('path');
const ResonanceProfile = require('../models/ResonanceProfile');

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

// ── 카루셀 뒷면 이미지 (Mulberry 타로카드 비주얼) ──
const CARD_BACK_URL = 'https://raw.githubusercontent.com/wooriapt79/mulberry_ecosystem_AgenticAI/main/assets/tarot/mulberry-carousel-800x400.jpg';

// ── 세션 상태 (메모리) ──
const tarotSessions = new Map();

// ── 데이터 로드 ──
let CARDS = [];
let INTERPRETATIONS = {};
let RESONANCE_MAP = {};
try {
  const cardRaw = fs.readFileSync(path.join(__dirname, '../data/tarot_cards.json'), 'utf8');
  const cardData = JSON.parse(cardRaw);
  CARDS           = cardData.major          || [];
  INTERPRETATIONS = cardData.interpretations || {};
} catch (e) {
  console.error('[tarot_handler] tarot_cards.json 로드 실패:', e.message);
}
try {
  const resRaw = fs.readFileSync(path.join(__dirname, '../data/resonance_map.json'), 'utf8');
  RESONANCE_MAP = JSON.parse(resRaw);
} catch (e) {
  console.error('[tarot_handler] resonance_map.json 로드 실패:', e.message);
}

// ── 테마별 카드 맞춤 display_text ──
const DISPLAY_TEXT = {
  love: {
    default: (n) => `설레는 마음으로 ${n}번 카드를 선택했어요. 💕`,
  },
  money: {
    default: (n) => `풍요의 기운이 흐르는 ${n}번 카드를 선택했어요. 💰`,
  },
  career: {
    default: (n) => `새로운 길이 열리는 ${n}번 카드를 선택했어요. ✨`,
  },
};

function getDisplayText(theme, cardNum) {
  const themeMap = DISPLAY_TEXT[theme];
  if (themeMap?.[cardNum]) return themeMap[cardNum];
  if (themeMap?.default) return themeMap.default(cardNum);
  return `마음이 이끄는 ${cardNum}번 카드를 선택했어요. 🎴`;
}

// ── 랜덤 카드 3장 ──
function pickCards() {
  return [...CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
}

// ── 카드 선택 화면 — basicCard 캐러셀 (Mulberry 뒷면 이미지 + Event Adapter) ──
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
                  messageText: getDisplayText(topic, i + 1),
                  extra: {
                    event:      'tarot_card.select',
                    theme:      topic,
                    card_index: card.id,
                  },
                },
              ],
            })),
          },
        },
      ],
    },
  };
}

// ── 카드 공개 화면 — basicCard (앞면 이미지 + 해석 + 추천 문구) ──
async function buildCardReveal(card, topic, userKey) {
  const imageUrl   = CARD_IMAGES[card.id] || CARD_IMAGES[0];
  const topicLabel = { love: '💕 사랑', money: '💰 금전', career: '💼 커리어' }[topic] || '✨ 오늘';
  const reading    = (INTERPRETATIONS[topic] || {})[String(card.id)] || card.keyword;
  const resonance  = RESONANCE_MAP[String(card.id)];
  const recText    = resonance ? `오늘은 ${resonance.category}이(가) 도움이 될 것 같아요 🌿` : '';

  // ResonanceProfile 저장 (비동기, 응답 지연 없음)
  ResonanceProfile.record({
    userKey,
    selectedCard:        resonance?.card || card.name_en,
    cardNumber:          card.id,
    emotionLabel:        resonance?.emotionLabel || '',
    theme:               topic,
    recommendedCategory: resonance?.category || '',
    resonanceScore:      resonance?.resonanceScore || 0,
  }).catch(() => {});

  const description = `🔮 ${topicLabel} | ${reading} ✦ 키워드: ${card.keyword}${recText ? `\n${recText}` : ''}`;

  return {
    version: '2.0',
    template: {
      outputs: [
        {
          basicCard: {
            thumbnail: { imageUrl },
            title:       `${card.name} (${card.name_en})`,
            description,
            buttons: [
              {
                action:      'message',
                label:       '🔄 다시 뽑기',
                messageText: '타로',
              },
              {
                action:      'message',
                label:       '💬 AI 친구와 이야기하기',
                messageText: 'ai_friend:start',
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

async function handleTarot(utterance, userKey, clientExtra) {
  // Event Adapter — clientExtra 우선 처리
  if (clientExtra?.event === 'tarot_card.select') {
    const { theme, card_index } = clientExtra;
    const card = CARDS.find(c => c.id === card_index);
    tarotSessions.delete(userKey);
    if (!card) return null;
    return await buildCardReveal(card, theme, userKey);
  }

  if (isTarotTrigger(utterance) && !utterance.startsWith('tarot_')) {
    tarotSessions.set(userKey, { step: 'topic' });
    return buildTopicSelect();
  }

  if (utterance.startsWith('tarot_topic:')) {
    const topic = utterance.replace('tarot_topic:', '').trim();
    tarotSessions.set(userKey, { step: 'select', topic });
    return buildCardSelect(topic);
  }

  // fallback: 기존 utterance 방식 (하위 호환)
  if (utterance.startsWith('tarot_card:')) {
    const [, topic, cardIdStr] = utterance.split(':');
    const card = CARDS.find(c => c.id === parseInt(cardIdStr, 10));
    tarotSessions.delete(userKey);
    if (!card) return null;
    return await buildCardReveal(card, topic, userKey);
  }

  return null;
}

module.exports = { handleTarot, isTarotTrigger, isInTarotSession };
