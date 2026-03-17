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
            'base_discount_rate': round(base_discount * 100, 1),
            'negotiation_bonus_rate': round(negotiation_bonus * 100, 1),
            'total_discount_rate': round(total_discount * 100, 1),
        }
        demand_agent.record_activity('협상', {'final_price': negotiated_price})
        supply_agent.record_activity('협상', {'agreed_price': negotiated_price})
        self.negotiation_history.append(details)
        return negotiated_price, details
    
    def generate_negotiation_dialogue(self, item_name, base_price, current_quantity, target_goal, negotiated_price, demand_agent, supply_agent):
        dialogues = []
        dialogues.append({'speaker': 'demand', 'agent_name': demand_agent.agent_name, 'avatar': '🌲', 'message': f"현재 {current_quantity}가구 참여 중. {target_goal}가구 목표. 단가 조정 요청."})
        initial_offer = int(base_price * 0.92)
        dialogues.append({'speaker': 'supply', 'agent_name': supply_agent.agent_name, 'avatar': '🏪', 'message': f"현재 {base_price:,}원. {current_quantity}가구라면 {initial_offer:,}원 가능."})
        dialogues.append({'speaker': 'demand', 'agent_name': demand_agent.agent_name, 'avatar': '🌲', 'message': f"정기배송 고려. {target_goal}가구로 늘릴테니 {negotiated_price:,}원?"})
        dialogues.append({'speaker': 'supply', 'agent_name': supply_agent.agent_name, 'avatar': '🏪', 'message': f"{demand_agent.self_status_info['trust_level']} 등급. {negotiated_price:,}원 타결!"})
        savings = base_price - negotiated_price
        dialogues.append({'speaker': 'system', 'agent_name': 'Mulberry', 'avatar': '🌾', 'message': f"협상 타결! {negotiated_price:,}원 ({savings:,}원 절감)"})
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
                total_savings += original_total - negotiated_total
                total_transactions += item_info['current']
        mulberry_revenue = int(total_savings * 0.03)
        ap2_fee = int(total_original * 0.005)
        return {
            'total_savings': total_savings,
            'mulberry_revenue': mulberry_revenue,
            'ap2_fee': ap2_fee,
            'net_community_benefit': total_savings - mulberry_revenue - ap2_fee,
            'total_transactions': total_transactions,
        }
