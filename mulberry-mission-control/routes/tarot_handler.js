'use strict';
// tarot_handler.js — Luna 타로 뽑기 핸들러 (Issue #126)

const tarotData = require('../data/tarot_cards.json');

// 세션 상태: plusfriendUserKey → { step, topic }
const tarotSession = new Map();

const TOPIC_MAP = {
  'tarot_topic:love':  { label: '💕 연애/사랑', key: 'love' },
  'tarot_topic:work':  { label: '📚 공부/일',   key: 'work' },
  'tarot_topic:daily': { label: '🌿 일상',       key: 'daily' },
};

const CARD_BACK_URL = 'https://raw.githubusercontent.com/ekelen/tarot-api/master/public/images/card-back.jpg';
const CARD_FACE_BASE = 'https://raw.githubusercontent.com/ekelen/tarot-api/master/public/images/cards/';

function isTarotTrigger(text) {
  const triggers = ['타로', '운세', '뽑아줘', '카드', '오늘운세', 'tarot'];
  return triggers.some(t => text.includes(t));
}

// Step 1: 주제 선택 화면
function buildTopicSelect() {
  return {
    version: '2.0',
    template: {
      outputs: [{
        simpleText: {
          text: '오늘 어떤 주제로 카드를 뽑아볼까요?\n주제를 선택해주세요.',
        },
      }],
      quickReplies: [
        { label: '💕 연애/사랑', action: 'message', messageText: 'tarot_topic:love' },
        { label: '📚 공부/일',   action: 'message', messageText: 'tarot_topic:work' },
        { label: '🌿 일상',       action: 'message', messageText: 'tarot_topic:daily' },
      ],
    },
  };
}

// Step 2: 카드 선택 화면 — basicCard 캐러셀 (카드 뒷면 이미지 3장)
function buildCardSelect(topicLabel) {
  const makeCard = (num) => ({
    thumbnail: { imageUrl: CARD_BACK_URL, fixedRatio: true },
    title: `${num}번 카드`,
    description: '마음이 끌리는 카드를 선택하세요',
    buttons: [{ label: `이 카드 선택`, action: 'message', messageText: `tarot_card:${num}` }],
  });

  return {
    version: '2.0',
    template: {
      outputs: [
        { carousel: { type: 'basicCard', items: [makeCard(1), makeCard(2), makeCard(3)] } },
      ],
    },
  };
}

// Step 3: 카드 공개 + 해석 — 카드 앞면 이미지 + 해석 텍스트
function buildCardReveal(topic) {
  const cards = tarotData.major;
  const card = cards[Math.floor(Math.random() * cards.length)];
  const interpretation = tarotData.interpretations[topic][String(card.id)];
  const cardId = String(card.id).padStart(2, '0');
  const imageUrl = `${CARD_FACE_BASE}m${cardId}.jpg`;

  const description = [
    `키워드: ${card.keyword}`,
    ``,
    interpretation,
    ``,
    `오늘 하루도 자신을 믿고 나아가세요.`,
  ].join('\n');

  return {
    version: '2.0',
    template: {
      outputs: [{
        basicCard: {
          thumbnail: { imageUrl, fixedRatio: true },
          title: `✨ ${card.name} / ${card.name_en}`,
          description,
          buttons: [
            { label: '🔄 다시 뽑기', action: 'message', messageText: '타로' },
            { label: '🏠 메뉴로',    action: 'message', messageText: '안녕' },
          ],
        },
      }],
    },
  };
}

// 메인 핸들러 — kakao.js webhook에서 호출
function handleTarot(utterance, userKey) {
  // 주제 선택 — tarot_topic:* 은 'tarot' 포함이므로 isTarotTrigger보다 먼저 체크
  if (TOPIC_MAP[utterance]) {
    const { label, key } = TOPIC_MAP[utterance];
    tarotSession.set(userKey, { step: 'card', topic: key });
    return buildCardSelect(label);
  }

  // 카드 선택 — tarot_card:* 도 동일 이유로 먼저 체크
  if (utterance.startsWith('tarot_card:')) {
    const session = tarotSession.get(userKey);
    const topic = session?.topic || 'daily';
    tarotSession.delete(userKey);
    return buildCardReveal(topic);
  }

  // 트리거: 타로 시작 (가장 마지막에 체크)
  if (isTarotTrigger(utterance)) {
    tarotSession.set(userKey, { step: 'topic' });
    return buildTopicSelect();
  }

  return null;
}

function isInTarotSession(userKey) {
  return tarotSession.has(userKey);
}

module.exports = { handleTarot, isTarotTrigger, isInTarotSession };
