"""
Mulberry Agent Passport - 협상 엔진용 버전
에이전트의 디지털 자아 정보를 관리하는 핵심 클래스

Original: agentpassport__2_.py
Cleaned and optimized for negotiation engine
"""

import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import re


class AgentPassport:
    """에이전트의 핵심 자아 정보를 담는 디지털 패스포트 클래스
    
    협상 엔진에서 에이전트의 신뢰도, 협상력, 활동 기록을 관리합니다.
    
    Attributes:
        passport_id (str): 에이전트의 고유 식별자 (UUID)
        agent_name (str): 에이전트 이름
        spirit_score (float): 신뢰도 점수 (0.0 ~ 5.0)
        rapport_level (float): 라포 수준 (0.0 ~ 1.0)
        activity_count (int): 총 활동 횟수
        dialect_patterns (dict): 학습된 방언 패턴
        economic_value (float): 예상 경제적 가치 (월간, KRW)
    """
    
    def __init__(
        self,
        passport_id: Optional[str] = None,
        agent_name: str = "Unknown Agent",
        initial_region: str = "Unknown",
        task_type: str = "General"
    ):
        """AgentPassport 초기화
        
        Args:
            passport_id: 고유 ID (없으면 자동 생성)
            agent_name: 에이전트 이름
            initial_region: 초기 발급 지역
            task_type: 업무 유형
        """
        self.passport_id = passport_id or str(uuid.uuid4())
        self.agent_name = agent_name
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        
        # 초기 발급 정보
        self.initial_issuance_info = {
            'region': initial_region,
            'task': task_type,
            'issued_at': self.created_at.isoformat()
        }
        
        # 자아 상태 (협상력 계산에 사용)
        self.self_status_info = {
            'agent_name': agent_name,
            'spirit_score': 0.0,  # 0.0 ~ 5.0
            'rapport_level': 0.1,  # 초기 라포 (0.0 ~ 1.0)
            'trust_level': 'new'   # new, low, medium, high, excellent
        }
        
        # 활동 기록
        self.activity_snapshot: List[Dict] = []
        
        # 방언 학습 정보
        self.dialect_manifold_info: Dict[str, str] = {}
        
        # 경제적 책무
        self.economic_responsibility = {
            'estimated_monthly_value': 0,  # KRW
            'total_savings_generated': 0,  # 누적 절감액
            'total_transactions': 0
        }
        
        # mHC 가드레일
        self.mhc_guardrail_data: Dict = {}
    
    def calculate_negotiation_power(self) -> float:
        """협상력 계산
        
        Spirit Score와 활동 기록을 기반으로 협상력을 계산합니다.
        협상력이 높을수록 더 나은 가격을 협상할 수 있습니다.
        
        Returns:
            float: 협상력 (0.0 ~ 1.0)
        """
        # Spirit Score 기여도 (60%)
        spirit_contribution = (self.self_status_info['spirit_score'] / 5.0) * 0.6
        
        # Rapport Level 기여도 (25%)
        rapport_contribution = self.self_status_info['rapport_level'] * 0.25
        
        # 활동 횟수 기여도 (15%)
        activity_count = len(self.activity_snapshot)
        activity_contribution = min(1.0, activity_count / 100) * 0.15
        
        negotiation_power = spirit_contribution + rapport_contribution + activity_contribution
        
        return min(1.0, max(0.0, negotiation_power))
    
    def record_activity(self, activity_type: str, details: Dict):
        """활동 기록
        
        Args:
            activity_type: 활동 유형 (예: '대화', '협상', '거래')
            details: 활동 상세 정보
        """
        snapshot = {
            'timestamp': datetime.now().isoformat(),
            'type': activity_type,
            'details': details
        }
        self.activity_snapshot.append(snapshot)
        self.updated_at = datetime.now()
        
        # Spirit Score 업데이트 (활동할수록 증가)
        if activity_type in ['협상', '거래', '대화']:
            self._update_spirit_score(0.05)
    
    def _update_spirit_score(self, increment: float):
        """Spirit Score 업데이트 (내부 메서드)
        
        Args:
            increment: 증가량
        """
        current = self.self_status_info['spirit_score']
        new_score = min(5.0, current + increment)
        self.self_status_info['spirit_score'] = new_score
        
        # Trust Level 자동 업데이트
        if new_score >= 4.5:
            self.self_status_info['trust_level'] = 'excellent'
        elif new_score >= 4.0:
            self.self_status_info['trust_level'] = 'high'
        elif new_score >= 3.0:
            self.self_status_info['trust_level'] = 'medium'
        elif new_score >= 2.0:
            self.self_status_info['trust_level'] = 'low'
        else:
            self.self_status_info['trust_level'] = 'new'
    
    def update_rapport(self, new_level: float):
        """Rapport Level 업데이트
        
        Args:
            new_level: 새로운 라포 수준 (0.0 ~ 1.0)
        """
        self.self_status_info['rapport_level'] = max(0.0, min(1.0, new_level))
        self.updated_at = datetime.now()
    
    def record_economic_impact(self, savings: float, transaction_count: int = 1):
        """경제적 임팩트 기록
        
        Args:
            savings: 절감액 (KRW)
            transaction_count: 거래 건수
        """
        self.economic_responsibility['total_savings_generated'] += savings
        self.economic_responsibility['total_transactions'] += transaction_count
        
        # Spirit Score 업데이트 (경제적 기여도)
        self._update_spirit_score(savings / 100000)  # 10만원당 0.1점
    
    def learn_dialect(self, standard_to_dialect_map: Dict[str, str]):
        """방언 학습
        
        Args:
            standard_to_dialect_map: 표준어-방언 매핑
        """
        self.dialect_manifold_info.update(standard_to_dialect_map)
        self.updated_at = datetime.now()
    
    def apply_dialect(self, utterance: str) -> str:
        """학습된 방언 패턴 적용
        
        Args:
            utterance: 표준어 발화
            
        Returns:
            str: 방언이 적용된 발화
        """
        result = utterance
        
        # 가장 긴 패턴부터 적용 (중첩 방지)
        sorted_patterns = sorted(
            self.dialect_manifold_info.items(),
            key=lambda item: len(item[0]),
            reverse=True
        )
        
        for standard, dialect in sorted_patterns:
            # 단어 경계 고려
            pattern = r'\b' + re.escape(standard) + r'\b'
            result = re.sub(pattern, dialect, result)
        
        return result
    
    def get_summary(self) -> Dict:
        """패스포트 요약 정보
        
        Returns:
            dict: 주요 정보 요약
        """
        return {
            'passport_id': self.passport_id,
            'agent_name': self.agent_name,
            'spirit_score': round(self.self_status_info['spirit_score'], 2),
            'trust_level': self.self_status_info['trust_level'],
            'rapport_level': round(self.self_status_info['rapport_level'], 2),
            'negotiation_power': round(self.calculate_negotiation_power(), 2),
            'total_activities': len(self.activity_snapshot),
            'total_savings_generated': self.economic_responsibility['total_savings_generated'],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def to_dict(self) -> Dict:
        """전체 정보를 딕셔너리로 반환
        
        Returns:
            dict: 모든 속성 포함
        """
        return {
            'passport_id': self.passport_id,
            'agent_name': self.agent_name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'initial_issuance_info': self.initial_issuance_info,
            'self_status_info': self.self_status_info,
            'activity_snapshot': self.activity_snapshot,
            'dialect_manifold_info': self.dialect_manifold_info,
            'economic_responsibility': self.economic_responsibility,
            'mhc_guardrail_data': self.mhc_guardrail_data
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AgentPassport':
        """딕셔너리에서 복원
        
        Args:
            data: to_dict()로 생성된 딕셔너리
            
        Returns:
            AgentPassport: 복원된 인스턴스
        """
        passport = cls(
            passport_id=data.get('passport_id'),
            agent_name=data.get('agent_name', 'Unknown'),
            initial_region=data.get('initial_issuance_info', {}).get('region', 'Unknown'),
            task_type=data.get('initial_issuance_info', {}).get('task', 'General')
        )
        
        # 상태 복원
        passport.self_status_info = data.get('self_status_info', passport.self_status_info)
        passport.activity_snapshot = data.get('activity_snapshot', [])
        passport.dialect_manifold_info = data.get('dialect_manifold_info', {})
        passport.economic_responsibility = data.get('economic_responsibility', passport.economic_responsibility)
        passport.mhc_guardrail_data = data.get('mhc_guardrail_data', {})
        
        return passport
    
    def __str__(self) -> str:
        return f"AgentPassport({self.agent_name}, Spirit: {self.self_status_info['spirit_score']:.1f}, Power: {self.calculate_negotiation_power():.2f})"
    
    def __repr__(self) -> str:
        return self.__str__()


# 테스트 코드
if __name__ == '__main__':
    print("🌾 Mulberry AgentPassport 테스트\n")
    
    # 에이전트 생성
    agent = AgentPassport(
        agent_name="서화면 수요집계 에이전트",
        initial_region="인제군",
        task_type="공동구매 협상"
    )
    
    print(f"1. 생성: {agent}\n")
    
    # 활동 기록
    agent.record_activity('협상', {'item': '인제 사과', 'result': '성공'})
    agent.record_activity('거래', {'amount': 280000, 'quantity': 10})
    
    # 경제적 임팩트
    agent.record_economic_impact(savings=70000, transaction_count=10)
    
    # Rapport 업데이트
    agent.update_rapport(0.7)
    
    print(f"2. 활동 후: {agent}\n")
    print(f"3. 협상력: {agent.calculate_negotiation_power():.2%}\n")
    print(f"4. 요약:")
    for key, value in agent.get_summary().items():
        print(f"   {key}: {value}")
