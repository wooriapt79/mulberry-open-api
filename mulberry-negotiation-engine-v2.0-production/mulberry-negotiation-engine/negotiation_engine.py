"""
Mulberry 협상 엔진 - 핵심 로직
에이전트 간 가격 협상 및 공동구매 시뮬레이션

Based on Malu's business logic + AgentPassport integration
"""

from typing import Dict, List, Tuple
from agent_passport import AgentPassport
import random


class NegotiationEngine:
    """에이전트 협상 엔진
    
    AgentPassport 기반으로 수요 집계 에이전트와 공급사 에이전트 간
    가격 협상을 시뮬레이션합니다.
    """
    
    def __init__(self):
        self.negotiation_history: List[Dict] = []
    
    def calculate_base_discount(
        self, 
        current_quantity: int, 
        target_goal: int, 
        max_discount: float = 0.30
    ) -> float:
        """기본 할인율 계산 (수량 기반)
        
        Args:
            current_quantity: 현재 참여 인원/수량
            target_goal: 목표 인원/수량
            max_discount: 최대 할인율 (기본 30%)
            
        Returns:
            float: 할인율 (0.0 ~ max_discount)
        """
        progress = current_quantity / target_goal
        return min(max_discount, progress * max_discount)
    
    def calculate_negotiation_bonus(
        self,
        demand_agent: AgentPassport,
        supply_agent: AgentPassport
    ) -> float:
        """협상 보너스 계산 (에이전트 협상력 기반)
        
        수요 집계 에이전트의 협상력이 높을수록,
        공급사 에이전트의 신뢰도가 높을수록 추가 할인 가능
        
        Args:
            demand_agent: 수요 집계 에이전트
            supply_agent: 공급사 에이전트
            
        Returns:
            float: 추가 할인율 (0.0 ~ 0.10)
        """
        # 수요 에이전트 협상력
        demand_power = demand_agent.calculate_negotiation_power()
        
        # 공급사 에이전트 신뢰도 (Spirit Score)
        supply_trust = supply_agent.self_status_info['spirit_score'] / 5.0
        
        # 협상 보너스 (최대 10% 추가)
        bonus = (demand_power * 0.6 + supply_trust * 0.4) * 0.10
        
        return min(0.10, bonus)
    
    def negotiate_price(
        self,
        base_price: int,
        current_quantity: int,
        target_goal: int,
        demand_agent: AgentPassport,
        supply_agent: AgentPassport
    ) -> Tuple[int, Dict]:
        """가격 협상 실행
        
        Args:
            base_price: 기본 가격 (소매가)
            current_quantity: 현재 참여 수량
            target_goal: 목표 수량
            demand_agent: 수요 집계 에이전트
            supply_agent: 공급사 에이전트
            
        Returns:
            Tuple[int, Dict]: (협상된 가격, 협상 상세 정보)
        """
        # 1. 기본 할인 계산
        base_discount = self.calculate_base_discount(current_quantity, target_goal)
        
        # 2. 협상 보너스 계산
        negotiation_bonus = self.calculate_negotiation_bonus(demand_agent, supply_agent)
        
        # 3. 총 할인율
        total_discount = min(0.40, base_discount + negotiation_bonus)
        
        # 4. 최종 가격
        negotiated_price = int(base_price * (1 - total_discount))
        
        # 5. 협상 상세 정보
        details = {
            'base_price': base_price,
            'negotiated_price': negotiated_price,
            'savings': base_price - negotiated_price,
            'savings_per_unit': base_price - negotiated_price,
            'base_discount_rate': round(base_discount * 100, 1),
            'negotiation_bonus_rate': round(negotiation_bonus * 100, 1),
            'total_discount_rate': round(total_discount * 100, 1),
            'demand_agent_power': round(demand_agent.calculate_negotiation_power(), 2),
            'supply_agent_trust': round(supply_agent.self_status_info['spirit_score'], 1),
            'current_quantity': current_quantity,
            'target_goal': target_goal,
            'progress': round((current_quantity / target_goal) * 100, 1)
        }
        
        # 6. 활동 기록
        demand_agent.record_activity('협상', {
            'item': f"협상 완료",
            'original_price': base_price,
            'final_price': negotiated_price,
            'discount_rate': total_discount
        })
        
        supply_agent.record_activity('협상', {
            'buyer': demand_agent.agent_name,
            'agreed_price': negotiated_price,
            'quantity': current_quantity
        })
        
        # 7. 협상 히스토리에 기록
        self.negotiation_history.append(details)
        
        return negotiated_price, details
    
    def generate_negotiation_dialogue(
        self,
        item_name: str,
        base_price: int,
        current_quantity: int,
        target_goal: int,
        negotiated_price: int,
        demand_agent: AgentPassport,
        supply_agent: AgentPassport
    ) -> List[Dict]:
        """협상 대화 생성 (시뮬레이션)
        
        Args:
            item_name: 상품명
            base_price: 기본 가격
            current_quantity: 현재 수량
            target_goal: 목표 수량
            negotiated_price: 협상된 가격
            demand_agent: 수요 집계 에이전트
            supply_agent: 공급사 에이전트
            
        Returns:
            List[Dict]: 대화 목록
        """
        dialogues = []
        
        # 1. 수요 에이전트 제안
        dialogues.append({
            'speaker': 'demand',
            'agent_name': demand_agent.agent_name,
            'avatar': '🌲',
            'message': f"안녕하세요. 현재 {item_name}에 대해 {current_quantity}가구가 구매 의사를 보였습니다. "
                      f"목표는 {target_goal}가구입니다. 대량 구매 조건으로 단가 조정 요청드립니다."
        })
        
        # 2. 공급사 에이전트 응답
        initial_offer = int(base_price * 0.92)  # 8% 할인 제안
        dialogues.append({
            'speaker': 'supply',
            'agent_name': supply_agent.agent_name,
            'avatar': '🏪',
            'message': f"반갑습니다. 현재 소매가는 {base_price:,}원입니다. "
                      f"{current_quantity}가구라면 {initial_offer:,}원까지 가능합니다."
        })
        
        # 3. 수요 에이전트 재협상
        counter_offer = int((negotiated_price + initial_offer) / 2)
        dialogues.append({
            'speaker': 'demand',
            'agent_name': demand_agent.agent_name,
            'avatar': '🌲',
            'message': f"감사합니다. 저희는 정기 배송(구독) 모델도 고려 중입니다. "
                      f"확정 물량을 {target_goal}가구로 늘릴 테니 {counter_offer:,}원에 맞춰주실 수 있을까요?"
        })
        
        # 4. 공급사 에이전트 타협
        dialogues.append({
            'speaker': 'supply',
            'agent_name': supply_agent.agent_name,
            'avatar': '🏪',
            'message': f"검토했습니다. {demand_agent.self_status_info['trust_level']} 등급 에이전트시니 "
                      f"신뢰하겠습니다. '{item_name} 상생 특가'로 {negotiated_price:,}원에 타결하겠습니다."
        })
        
        # 5. 최종 타결
        savings = base_price - negotiated_price
        savings_rate = (savings / base_price) * 100
        dialogues.append({
            'speaker': 'system',
            'agent_name': 'Mulberry System',
            'avatar': '🌾',
            'message': f"🎉 협상 타결! 최종가: {negotiated_price:,}원 "
                      f"(개당 {savings:,}원 절감, {savings_rate:.1f}% 할인)"
        })
        
        return dialogues
    
    def calculate_economic_impact(
        self,
        items: Dict[str, Dict],
        agents: Dict[str, AgentPassport]
    ) -> Dict:
        """경제적 임팩트 계산
        
        Args:
            items: 공동구매 아이템 목록
            agents: 에이전트 목록
            
        Returns:
            Dict: 경제적 임팩트 요약
        """
        total_savings = 0
        total_original = 0
        total_transactions = 0
        
        for item_name, item_info in items.items():
            if item_info['current'] > 0:
                # 원래 가격
                original_total = item_info['base_price'] * item_info['current']
                total_original += original_total
                
                # 협상된 가격
                negotiated_price = item_info.get('negotiated_price', item_info['base_price'])
                negotiated_total = negotiated_price * item_info['current']
                
                # 절감액
                savings = original_total - negotiated_total
                total_savings += savings
                
                # 거래 건수
                total_transactions += item_info['current']
        
        # Mulberry 운영 수익 (CPO 3%)
        mulberry_revenue = int(total_savings * 0.03)
        
        # AP2 거래 수수료 (0.5%)
        ap2_fee = int(total_original * 0.005)
        
        return {
            'total_original': total_original,
            'total_negotiated': total_original - total_savings,
            'total_savings': total_savings,
            'savings_rate': round((total_savings / total_original * 100) if total_original > 0 else 0, 1),
            'mulberry_revenue': mulberry_revenue,
            'ap2_fee': ap2_fee,
            'net_community_benefit': total_savings - mulberry_revenue - ap2_fee,
            'total_transactions': total_transactions,
            'avg_savings_per_transaction': int(total_savings / total_transactions) if total_transactions > 0 else 0
        }


# 테스트 코드
if __name__ == '__main__':
    print("🌾 Mulberry 협상 엔진 테스트\n")
    
    # 에이전트 생성
    demand_agent = AgentPassport(
        agent_name="서화면 수요집계 에이전트",
        initial_region="인제군",
        task_type="공동구매"
    )
    demand_agent.update_rapport(0.7)
    demand_agent.record_activity('협상', {'history': '과거 10건 성공'})
    
    supply_agent = AgentPassport(
        agent_name="인제농협 공급 에이전트",
        initial_region="인제군",
        task_type="농산물 공급"
    )
    supply_agent.self_status_info['spirit_score'] = 4.2
    
    # 협상 엔진
    engine = NegotiationEngine()
    
    # 협상 실행
    negotiated_price, details = engine.negotiate_price(
        base_price=35000,
        current_quantity=14,
        target_goal=20,
        demand_agent=demand_agent,
        supply_agent=supply_agent
    )
    
    print(f"1. 협상 결과:")
    print(f"   원가: {details['base_price']:,}원")
    print(f"   협상가: {negotiated_price:,}원")
    print(f"   절감: {details['savings']:,}원 ({details['total_discount_rate']}%)")
    print(f"   진행률: {details['progress']}%\n")
    
    print(f"2. 협상 대화:")
    dialogues = engine.generate_negotiation_dialogue(
        "인제 사과 5kg",
        35000,
        14,
        20,
        negotiated_price,
        demand_agent,
        supply_agent
    )
    for i, dialogue in enumerate(dialogues, 1):
        print(f"   [{i}] {dialogue['avatar']} {dialogue['agent_name']}:")
        print(f"       {dialogue['message']}\n")
