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
    """에이전트의 핵심 자아 정보를 담는 디지털 패스포트 클래스"""
    
    def __init__(self, passport_id=None, agent_name="Unknown Agent", initial_region="Unknown", task_type="General"):
        self.passport_id = passport_id or str(uuid.uuid4())
        self.agent_name = agent_name
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.initial_issuance_info = {'region': initial_region, 'task': task_type, 'issued_at': self.created_at.isoformat()}
        self.self_status_info = {'agent_name': agent_name, 'spirit_score': 0.0, 'rapport_level': 0.1, 'trust_level': 'new'}
        self.activity_snapshot = []
        self.dialect_manifold_info = {}
        self.economic_responsibility = {'estimated_monthly_value': 0, 'total_savings_generated': 0, 'total_transactions': 0}
        self.mhc_guardrail_data = {}
    
    def calculate_negotiation_power(self):
        spirit_contribution = (self.self_status_info['spirit_score'] / 5.0) * 0.6
        rapport_contribution = self.self_status_info['rapport_level'] * 0.25
        activity_count = len(self.activity_snapshot)
        activity_contribution = min(1.0, activity_count / 100) * 0.15
        return min(1.0, max(0.0, spirit_contribution + rapport_contribution + activity_contribution))
    
    def record_activity(self, activity_type, details):
        snapshot = {'timestamp': datetime.now().isoformat(), 'type': activity_type, 'details': details}
        self.activity_snapshot.append(snapshot)
        self.updated_at = datetime.now()
        if activity_type in ['협상', '거래', '대화']:
            self._update_spirit_score(0.05)
    
    def _update_spirit_score(self, increment):
        current = self.self_status_info['spirit_score']
        new_score = min(5.0, current + increment)
        self.self_status_info['spirit_score'] = new_score
        if new_score >= 4.5: self.self_status_info['trust_level'] = 'excellent'
        elif new_score >= 4.0: self.self_status_info['trust_level'] = 'high'
        elif new_score >= 3.0: self.self_status_info['trust_level'] = 'medium'
        elif new_score >= 2.0: self.self_status_info['trust_level'] = 'low'
        else: self.self_status_info['trust_level'] = 'new'
    
    def update_rapport(self, new_level):
        self.self_status_info['rapport_level'] = max(0.0, min(1.0, new_level))
        self.updated_at = datetime.now()
    
    def record_economic_impact(self, savings, transaction_count=1):
        self.economic_responsibility['total_savings_generated'] += savings
        self.economic_responsibility['total_transactions'] += transaction_count
        self._update_spirit_score(savings / 100000)
    
    def learn_dialect(self, standard_to_dialect_map):
        self.dialect_manifold_info.update(standard_to_dialect_map)
        self.updated_at = datetime.now()
    
    def apply_dialect(self, utterance):
        result = utterance
        sorted_patterns = sorted(self.dialect_manifold_info.items(), key=lambda item: len(item[0]), reverse=True)
        for standard, dialect in sorted_patterns:
            pattern = r'\b' + re.escape(standard) + r'\b'
            result = re.sub(pattern, dialect, result)
        return result
    
    def get_summary(self):
        return {
            'passport_id': self.passport_id, 'agent_name': self.agent_name,
            'spirit_score': round(self.self_status_info['spirit_score'], 2),
            'trust_level': self.self_status_info['trust_level'],
            'rapport_level': round(self.self_status_info['rapport_level'], 2),
            'negotiation_power': round(self.calculate_negotiation_power(), 2),
            'total_activities': len(self.activity_snapshot),
        }
    
    def to_dict(self):
        return {
            'passport_id': self.passport_id, 'agent_name': self.agent_name,
            'created_at': self.created_at.isoformat(), 'updated_at': self.updated_at.isoformat(),
            'initial_issuance_info': self.initial_issuance_info, 'self_status_info': self.self_status_info,
            'activity_snapshot': self.activity_snapshot, 'dialect_manifold_info': self.dialect_manifold_info,
            'economic_responsibility': self.economic_responsibility, 'mhc_guardrail_data': self.mhc_guardrail_data
        }
    
    @classmethod
    def from_dict(cls, data):
        passport = cls(passport_id=data.get('passport_id'), agent_name=data.get('agent_name', 'Unknown'),
                       initial_region=data.get('initial_issuance_info', {}).get('region', 'Unknown'),
                       task_type=data.get('initial_issuance_info', {}).get('task', 'General'))
        passport.self_status_info = data.get('self_status_info', passport.self_status_info)
        passport.activity_snapshot = data.get('activity_snapshot', [])
        passport.dialect_manifold_info = data.get('dialect_manifold_info', {})
        passport.economic_responsibility = data.get('economic_responsibility', passport.economic_responsibility)
        passport.mhc_guardrail_data = data.get('mhc_guardrail_data', {})
        return passport
    
    def __str__(self):
        return f"AgentPassport({self.agent_name}, Spirit: {self.self_status_info['spirit_score']:.1f}, Power: {self.calculate_negotiation_power():.2f})"
    
    def __repr__(self):
        return self.__str__()
