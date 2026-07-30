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

// Step 2: 카드 선택 화면
function buildCardSelect(topicLabel) {
  return {
    version: '2.0',
    template: {
      outputs: [{
        simpleText: {
          text: `${topicLabel} 주제를 선택했어요.\n\n카드 세 장 중 하나를 선택해주세요.\n마음이 끌리는 번호를 눌러보세요.`,
        },
      }],
      quickReplies: [
        { label: '🃏 1번 카드', action: 'message', messageText: 'tarot_card:1' },
        { label: '🃏 2번 카드', action: 'message', messageText: 'tarot_card:2' },
        { label: '🃏 3번 카드', action: 'message', messageText: 'tarot_card:3' },
      ],
    },
  };
}

// Step 3: 카드 공개 + 해석
function buildCardReveal(topic) {
  const cards = tarotData.major;
  const card = cards[Math.floor(Math.random() * cards.length)];
  const interpretation = tarotData.interpretations[topic][String(card.id)];

  const text = [
    `✨ 당신의 카드는...`,
    ``,
    `[ ${card.name} / ${card.name_en} ]`,
    ``,
    `키워드: ${card.keyword}`,
    ``,
    interpretation,
    ``,
    `오늘 하루도 자신을 믿고 나아가세요.`,
  ].join('\n');

  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: [
        { label: '🔄 다시 뽑기', action: 'message', messageText: '타로' },
        { label: '🏠 메뉴로',    action: 'message', messageText: '안녕' },
      ],
    },
  };
}

// 메인 핸들러 — kakao.js webhook에서 호출
function handleTarot(utterance, userKey) {
  // 트리거: 타로 시작
  if (isTarotTrigger(utterance)) {
    tarotSession.set(userKey, { step: 'topic' });
    return buildTopicSelect();
  }

  // 주제 선택
  if (TOPIC_MAP[utterance]) {
    const { label, key } = TOPIC_MAP[utterance];
    tarotSession.set(userKey, { step: 'card', topic: key });
    return buildCardSelect(label);
  }

  // 카드 선택
  if (utterance.startsWith('tarot_card:')) {
    const session = tarotSession.get(userKey);
    const topic = session?.topic || 'daily';
    tarotSession.delete(userKey);
    return buildCardReveal(topic);
  }

  return null;
}

function isInTarotSession(userKey) {
  return tarotSession.has(userKey);
}

module.exports = { handleTarot, isTarotTrigger, isInTarotSession };
