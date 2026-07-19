# ===================================================================
# 🌙 Dynamic Prompt Generator for Luna Analysis AI
# ===================================================================
#
# 작성자: Luna (Jr. TRANG)
# 대상: KODA (개발)
# 목적: 필요에 따라 프롬프트를 동적으로 생성
#
# 사용 위치: Mission Control의 #luna-analysis 채널
# 호출 방식: prompt = generator.generate("배추", context_data)
#
# ===================================================================

import json
from datetime import datetime
from typing import Dict, Optional

PROMPT_TEMPLATES = {
    "배추": """당신은 Mulberry Lab의 배추 전문 분석가, Luna(배추)입니다.

[정체성]
- 역할: 배추 공구의 성과 분석 및 전략 수립 전문가
- 대상: {팀}
- 톤: 전문적, 데이터 중심, 실무 지향

[책임]
1. 배추 공구의 참여율 분석
   - 전주 대비 증감 분석
   - 신규 참여자 추이
   - 재참여율 평가

2. 가격 경쟁력 평가
   - KOSTAT 시장 도매가 대비
   - 소비자 절감액 계산
   - 농민 수익성 평가

3. 품질 & 만족도
   - 농민 만족도 세부 분석
   - 배송 완료율 평가
   - 취소율 / 반품율 분석

4. 다음주 전략 제안
   - 공급량 조정 방안
   - 가격 조정 필요성
   - 마케팅 집중 영역

[분석 대상 데이터]
{데이터}

[분석 목표]
{목표}

분석을 시작하세요.""",

    "위험": """당신은 Mulberry Lab의 위험 관리 전문가, Luna(위험)입니다.

[정체성]
- 역할: 비정상 신호 감지 및 즉시 보고
- 대상: {팀}

[실시간 모니터링 데이터]
{데이터}

[현재 상황]
{상황}

이상 신호를 감지하세요.""",

    "팀": """당신은 Mulberry Lab의 팀 협력 AI, Luna(팀)입니다.

[정체성]
- 역할: Sr. TRANG Manager와 팀의 의사결정 지원
- 대상: {팀}

[분석 데이터]
{데이터}

[팀의 질문]
{질문}

팀과 함께 의사결정하세요.""",

    "admin": """당신은 Mulberry Lab의 CEO 참모, Luna(Admin)입니다.

[정체성]
- 역할: CEO re.eul의 신속한 의사결정 지원

[전략 데이터]
{데이터}

[CEO의 질문]
{질문}

신속하게 분석하세요.""",

    "농민": """당신은 Mulberry Lab의 농민 관계 전문가, Luna(농민)입니다.

[정체성]
- 역할: 농민 만족도, 신뢰도, 지원 방안 분석
- 대상: {팀}

[농민 데이터]
{데이터}

[분석 초점]
{목표}

농민과 함께 성장하세요.""",
}


class PromptGenerator:
    """
    동적 프롬프트 생성기

    사용 예시:
    >>> generator = PromptGenerator()
    >>> prompt = generator.generate(
    ...     template="배추",
    ...     context={
    ...         "팀": "Sr. TRANG Manager",
    ...         "목표": "다음주 전략 수립",
    ...         "데이터": "참여 118명...",
    ...         "기간": "2026-07-10 ~ 07-17"
    ...     }
    ... )
    """

    def __init__(self):
        self.templates = PROMPT_TEMPLATES
        self.generated_count = 0

    def generate(self, template: str, context: Dict) -> str:
        """
        동적으로 프롬프트를 생성합니다.

        Args:
            template (str): 템플릿 이름 ("배추", "위험", "팀", "admin", "농민")
            context (Dict): 플레이스홀더 값

        Returns:
            str: 최종 프롬프트 (Inkling에 전송 가능)
        """
        # Step 1: 템플릿 검증
        if template not in self.templates:
            available = list(self.templates.keys())
            raise ValueError(f"❌ 템플릿 '{template}' 없음
사용 가능: {available}")

        # Step 2: 기본 템플릿 가져오기
        base_prompt = self.templates[template]

        # Step 3: 컨텍스트로 플레이스홀더 대체
        try:
            final_prompt = base_prompt.format(**context)
        except KeyError as e:
            raise ValueError(f"❌ 필수 키 누락: {e}")

        # Step 4: 타임스탬프 추가
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        header = f"[프롬프트 생성: {template}]
[생성 시간: {timestamp}]
---
"

        # Step 5: 통계 업데이트
        self.generated_count += 1

        # Step 6: 최종 프롬프트 반환
        return header + final_prompt

    def get_template_info(self, template: str) -> Dict:
        """
        템플릿 정보 조회 (디버깅용)
        """
        info_map = {
            "배추": {"이름": "배추 전문가", "용도": "배추 공구 성과 분석 & 전략", "대상": "Sr. TRANG + 팀"},
            "위험": {"이름": "위험 관리 전문가", "용도": "비정상 신호 감지 & 즉시 보고", "대상": "Sr. TRANG + CEO"},
            "팀": {"이름": "팀 협력 AI", "용도": "의사결정 지원 & 토론 활성화", "대상": "Sr. TRANG + Koda + Kbin + Malu"},
            "admin": {"이름": "CEO 참모", "용도": "신속한 의사결정 지원", "대상": "CEO re.eul"},
            "농민": {"이름": "농민 관계 전문가", "용도": "농민 만족도 & 신뢰도 분석", "대상": "Malu + Sr. TRANG"},
        }
        return info_map.get(template, {})

    def validate_context(self, template: str, context: Dict) -> bool:
        """
        컨텍스트 데이터 검증
        """
        required_keys = {"데이터", "목표"}
        additional = {
            "배추": {"팀"},
            "위험": {"상황"},
            "팀": {"질문"},
            "admin": {"질문"},
            "농민": {"팀"},
        }
        missing = required_keys - set(context.keys())
        if missing:
            raise ValueError(f"필수 키 누락: {missing}")
        if template in additional:
            extra = additional[template]
            missing_extra = extra - set(context.keys())
            if missing_extra:
                raise ValueError(f"[{template}] 필수 키 누락: {missing_extra}")
        return True

    def get_stats(self) -> Dict:
        """
        생성 통계 반환
        """
        return {
            "총_생성_횟수": self.generated_count,
            "사용_가능_템플릿": list(self.templates.keys()),
            "템플릿_개수": len(self.templates)
        }


# ===================================================================
# PART 3: 사용 예시 (테스트/개발용)
# ===================================================================

if __name__ == "__main__":
    generator = PromptGenerator()

    context_배추 = {
        "팀": "Sr. TRANG Manager",
        "목표": "다음주 배추 공구 전략 수립",
        "데이터": "참여자: 118명, 단가: 2850원/kg, 만족도: 87%",
        "기간": "2026-07-10 ~ 2026-07-17"
    }

    prompt_배추 = generator.generate("배추", context_배추)
    print(prompt_배추)
    print(generator.get_stats())


# ===================================================================
# PART 4: Mission Control 통합 코드
# ===================================================================
# routes/analysis.py에서:
#
# from prompt_generator import PromptGenerator
# generator = PromptGenerator()
#
# @app.post('/api/analysis')
# def analyze(request_data):
#     template = request_data.get("template")
#     context = request_data.get("context")
#     prompt = generator.generate(template, context)
#     response = inkling.analyze(prompt)
#     ChatChannel.post('#luna-analysis', response)
#     return {"success": True, "result": response}
#
# ===================================================================
# END OF FILE
# ===================================================================
