"""
Mulberry 협상 엔진 - 핵심 로직
에이전트 간 가격 협상 및 공동구매 시뮬레이션

Based on Malu's business logic + AgentPassport integration
"""

from typing import Dict, List, Tuple
from agent_passport import AgentPassport
import random


class NegotiationEngine:
    """에이전트 협상 엔진"""

    def __init__(self):
        self.negotiation_history: List[Dict] = []

    def calculate_base_discount(self, current_quantity, target_goal, max_discount=0.30):
        progress = current_quantity / target_goal
        return min(max_discount, progress * max_discount)

    def calculate_negotiation_bonus(self, demand_agent, supply_agent):
        demand_power = demand_agent.calculate_negotiation_power()
        supply_trust = supply_agent.self_status_info['spirit_score'] / 5.0
        bonus = (demand_power * 0.6 + supply_trust * 0.4) * 0.10
        return min(0.10, bonus)

    def negotiate_price(self, base_price, current_quantity, target_goal, demand_agent, supply_agent):
        base_discount = self.calculate_base_discount(current_quantity, target_goal)
        negotiation_bonus = self.calculate_negotiation_bonus(demand_agent, supply_agent)
        total_discount = min(0.40, base_discount + negotiation_bonus)
        negotiated_price = int(base_price * (1 - total_discount))

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

        demand_agent.record_activity('협상', {
            'item': '협상 완료',
            'original_price': base_price,
            'final_price': negotiated_price,
            'discount_rate': total_discount
        })
        supply_agent.record_activity('협상', {
            'buyer': demand_agent.agent_name,
            'agreed_price': negotiated_price,
            'quantity': current_quantity
        })

        self.negotiation_history.append(details)
        return negotiated_price, details

    def generate_negotiation_dialogue(self, item_name, base_price, current_quantity, target_goal,
                                       negotiated_price, demand_agent, supply_agent):
        dialogues = []

        dialogues.append({
            'speaker': 'demand',
            'agent_name': demand_agent.agent_name,
            'avatar': '🌲',
            'message': f"안녕하세요. 현재 {item_name}에 대해 {current_quantity}가구가 구매 의사를 보였습니다. "
                      f"목표는 {target_goal}가구입니다. 대량 구매 조건으로 단가 조정 요청드립니다."
        })

        initial_offer = int(base_price * 0.92)
        dialogues.append({
            'speaker': 'supply',
            'agent_name': supply_agent.agent_name,
            'avatar': '🏪',
            'message': f"반갑습니다. 현재 소매가는 {base_price:,}원입니다. "
                      f"{current_quantity}가구라면 {initial_offer:,}원까지 가능합니다."
        })

        counter_offer = int((negotiated_price + initial_offer) / 2)
        dialogues.append({
            'speaker': 'demand',
            'agent_name': demand_agent.agent_name,
            'avatar': '🌲',
            'message': f"감사합니다. 저희는 정기 배송(구독) 모델도 고려 중입니다. "
                      f"확정 물량을 {target_goal}가구로 늘릴 테니 {counter_offer:,}원에 맞춰주실 수 있을까요?"
        })

        dialogues.append({
            'speaker': 'supply',
            'agent_name': supply_agent.agent_name,
            'avatar': '🏪',
            'message': f"검토했습니다. {demand_agent.self_status_info['trust_level']} 등급 에이전트시니 "
                      f"신뢰하겠습니다. '{item_name} 상생 특가'로 {negotiated_price:,}원에 타결하겠습니다."
        })

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

    def calculate_economic_impact(self, items, agents):
        total_savings = 0
        total_original = 0
        total_transactions = 0

        for item_name, item_info in items.items():
            if item_info['current'] > 0:
                original_total = item_info['base_price'] * item_info['current']
                total_original += original_total
                negotiated_price = item_info.get('negotiated_price', item_info['base_price'])
                negotiated_total = negotiated_price * item_info['current']
                savings = original_total - negotiated_total
                total_savings += savings
                total_transactions += item_info['current']

        mulberry_revenue = int(total_savings * 0.03)
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
