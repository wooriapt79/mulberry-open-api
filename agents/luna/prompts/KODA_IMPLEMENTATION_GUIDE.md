# 🚀 KODA를 위한 구현 가이드
## Dynamic Prompt Generator + Mission Control 통합

**대상**: KODA (CTO/개발팀)
**작성자**: Luna (Jr. TRANG)
**작성일**: 2026-07-17
**상태**: 즉시 구현 가능

---

## **📋 파일 구성**

```
1️⃣ prompts_templates.md — 5가지 프롬프트 템플릿
2️⃣ prompt_generator.py — 동적 프롬프트 생성 함수
3️⃣ KODA_IMPLEMENTATION_GUIDE.md — 이 파일
```

---

## **⚡ 빠른 시작 (5분)**

### **Step 1: 파일 확인**

```
mulberry-mission-control/
├─ utils/
│  └─ prompt_generator.py ← 여기에 복사
└─ routes/
   └─ analysis.py ← KODA가 작성
```

### **Step 2: 코드 구조 이해**

```python
# PART 1: 템플릿 정의
PROMPT_TEMPLATES = {
    "배추": "...",
    "위험": "...",
    "팀": "...",
    "admin": "...",
    "농민": "..."
}

# PART 2: 생성 함수 (핵심!)
class PromptGenerator:
    def generate(template, context):
        return final_prompt

# PART 4: Mission Control 통합 예시
# routes/analysis.py에서 사용
```

---

## **🔧 KODA가 할 일 (2가지)**

### **Task 1: prompt_generator.py를 프로젝트에 추가**

```bash
# Step 1: 파일 복사
cp prompt_generator.py ./mulberry-mission-control/utils/

# Step 2: 임포트 테스트
python -c "from utils.prompt_generator import PromptGenerator; print('✅ OK')"

# Step 3: 테스트 실행
python mulberry-mission-control/utils/prompt_generator.py
```

### **Task 2: routes/analysis.py 작성**

```python
from flask import Blueprint, request, jsonify
from utils.prompt_generator import PromptGenerator
from mulberry_api import InklingAPI, ChatChannel
from datetime import datetime

generator = PromptGenerator()
analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/api/analysis', methods=['POST'])
def analyze():
    """분석 요청 → 프롬프트 생성 → Inkling 분석 → #luna-analysis 출력"""
    try:
        data = request.get_json()
        template = data.get("template")   # "배추", "위험" 등
        context = data.get("context")     # 데이터

        generator.validate_context(template, context)
        prompt = generator.generate(template, context)
        response = InklingAPI.analyze(prompt)

        ChatChannel.post(
            channel='#luna-analysis',
            message=response,
            metadata={'template': template, 'timestamp': datetime.now()}
        )

        return jsonify({'success': True, 'result': response, 'template': template})

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'분석 실패: {str(e)}'}), 500

# app.py에서: app.register_blueprint(analysis_bp)
```

---

## **📌 필수 Context 키**

```python
# 모든 템플릿 공통
"데이터": "실제 데이터",
"목표": "분석 목표",

# 템플릿별 추가 필수 키
"배추" / "농민": "팀"
"위험": "상황"
"팀": "질문"
"admin": "질문"
```

---

## **✅ 체크리스트**

```
구현 전:
☐ prompts_templates.md 읽음
☐ prompt_generator.py 읽음
☐ 5가지 템플릿 이해함

구현 중:
☐ prompt_generator.py를 utils/에 추가
☐ routes/analysis.py 작성
☐ Flask Blueprint 등록
☐ 로컬 테스트 성공

구현 후:
☐ API 테스트 성공
☐ Mission Control 통합 확인
☐ #luna-analysis 채널 작동 확인
```

---

**KODA, 준비됐나요? 🚀**
질문 있으면 #luna-analysis에서 @luna-team 으로!
