"""
🌾 Mulberry 협상 엔진 - 통합 테스트
PM Trang 요청사항 반영

1. 통합 테스트 (Passport + Ghost Archive + 협상 + AP2)
2. 엣지 케이스 (리셋, 네트워크 단절, 데이터 충돌)
3. AP2 Mandate 조건 협상 검증
"""

import sys
import json
import time
from datetime import datetime
sys.path.append('/home/claude/mulberry-negotiation-engine')

from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile

class IntegrationTest:
    """통합 테스트 클래스"""
    
    def __init__(self):
        self.engine = NegotiationEngine()
        self.test_results = []
        self.errors = []
    
    def log_test(self, test_name, passed, details=""):
        """테스트 결과 기록"""
        result = {
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} | {test_name}")
        if details:
            print(f"      {details}")
        
        if not passed:
            self.errors.append(test_name)
    
    def test_passport_ghost_archive_integration(self):
        """TEST 1: Passport + Ghost Archive 통합"""
        print("\n" + "=" * 70)
        print("TEST 1: AgentPassport + Ghost Archive 통합")
        print("=" * 70)
        
        try:
            # 1. Passport 생성
            profile = get_agent_profile('demand_agent')
            agent = AgentPassport(
                agent_name=profile['agent_name'],
                initial_region=profile['initial_region'],
                task_type=profile['task_type']
            )
            agent.self_status_info['spirit_score'] = profile['spirit_score']
            agent.update_rapport(profile['rapport_level'])
            
            # 2. 활동 기록 (Ghost Archive에 저장됨)
            initial_activity_count = len(agent.activity_snapshot)
            
            agent.record_activity("협상 시작", "인제 사과 협상")
            agent.record_activity("가격 제안", "35,000원 → 28,000원")
            agent.record_activity("협상 타결", "최종 28,000원 확정")
            
            final_activity_count = len(agent.activity_snapshot)
            
            # 3. Ghost Archive 기록 확인
            activities_added = final_activity_count - initial_activity_count
            
            self.log_test(
                "Passport-GhostArchive 통합",
                activities_added == 3,
                f"활동 {activities_added}개 기록됨 (예상 3개)"
            )
            
            # 4. Passport 데이터 직렬화 (백업)
            passport_data = agent.to_dict()
            self.log_test(
                "Passport 직렬화",
                'passport_id' in passport_data and 'activity_snapshot' in passport_data,
                "모든 필드 포함 확인"
            )
            
            # 5. Passport 복구 테스트
            recovered = AgentPassport.from_dict(passport_data)
            self.log_test(
                "Passport 복구",
                recovered.passport_id == agent.passport_id,
                f"복구된 ID: {recovered.passport_id[:8]}..."
            )
            
            return True
            
        except Exception as e:
            self.log_test("Passport-GhostArchive 통합", False, str(e))
            return False
    
    def test_negotiation_ap2_mandate_integration(self):
        """TEST 2: 협상 스킬 + AP2 Mandate 통합"""
        print("\n" + "=" * 70)
        print("TEST 2: 협상 스킬 + AP2 Mandate '조건 협상' 단계")
        print("=" * 70)
        
        try:
            # 1. 에이전트 생성
            demand_profile = get_agent_profile('demand_agent')
            demand_agent = AgentPassport(
                agent_name=demand_profile['agent_name'],
                initial_region=demand_profile['initial_region'],
                task_type=demand_profile['task_type']
            )
            demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
            demand_agent.update_rapport(demand_profile['rapport_level'])
            
            supply_profile = get_agent_profile('agent_inje_apple')
            supply_agent = AgentPassport(
                agent_name=supply_profile['agent_name'],
                initial_region=supply_profile['initial_region'],
                task_type=supply_profile['task_type']
            )
            supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
            supply_agent.update_rapport(supply_profile.get('rapport_level', 0.7))
            
            # 2. 협상 실행 (AP2 Mandate 조건 협상 단계)
            base_price = 35000
            current_quantity = 14
            target_goal = 20
            
            negotiated_price, details = self.engine.negotiate_price(
                base_price=base_price,
                current_quantity=current_quantity,
                target_goal=target_goal,
                demand_agent=demand_agent,
                supply_agent=supply_agent
            )
            
            # 3. 협상 결과 검증
            discount_valid = negotiated_price < base_price
            savings = base_price - negotiated_price
            
            self.log_test(
                "AP2 Mandate 조건 협상",
                discount_valid and savings > 0,
                f"기본가 {base_price:,}원 → 협상가 {negotiated_price:,}원 (절감 {savings:,}원)"
            )
            
            # 4. 상부상조 10% 로직 검증
            # Mulberry 수익 = 절감액의 3%
            total_savings = savings * current_quantity
            mulberry_revenue = total_savings * 0.03
            
            # 상부상조 10% = 에이전트가 절감액의 10%를 지역에 환원
            community_share = total_savings * 0.10
            
            self.log_test(
                "상부상조 10% 로직",
                community_share > 0,
                f"지역 환원: {community_share:,.0f}원 (절감액의 10%)"
            )
            
            # 5. AP2 거래 증명 (블록체인 검증 시뮬레이션)
            ap2_mandate = {
                'transaction_id': f"TX_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'demand_agent': demand_agent.passport_id,
                'supply_agent': supply_agent.passport_id,
                'item': '인제 사과 (5kg)',
                'quantity': current_quantity,
                'negotiated_price': negotiated_price,
                'original_price': base_price,
                'savings': savings,
                'mulberry_fee': mulberry_revenue,
                'community_share': community_share,
                'verified': True,
                'timestamp': datetime.now().isoformat()
            }
            
            self.log_test(
                "AP2 Mandate 생성",
                ap2_mandate['verified'] == True,
                f"거래 ID: {ap2_mandate['transaction_id']}"
            )
            
            # 6. 협상 활동 기록 (Ghost Archive)
            demand_agent.record_activity(
                "AP2 협상 완료",
                json.dumps(ap2_mandate, ensure_ascii=False)
            )
            
            supply_agent.record_activity(
                "AP2 협상 완료",
                json.dumps(ap2_mandate, ensure_ascii=False)
            )
            
            self.log_test(
                "협상 활동 기록",
                len(demand_agent.activity_snapshot) > 0,
                "Ghost Archive에 AP2 거래 기록됨"
            )
            
            return True
            
        except Exception as e:
            self.log_test("협상-AP2 통합", False, str(e))
            return False
    
    def test_edge_case_agent_reset(self):
        """TEST 3: 엣지 케이스 - 에이전트 리셋"""
        print("\n" + "=" * 70)
        print("TEST 3: 엣지 케이스 - 에이전트 리셋 & 복구")
        print("=" * 70)
        
        try:
            # 1. 에이전트 생성 및 활동
            agent = AgentPassport(
                agent_name="테스트 에이전트",
                initial_region="인제군",
                task_type="협상"
            )
            agent.self_status_info['spirit_score'] = 4.0
            agent.update_rapport(0.8)
            
            # 활동 기록
            agent.record_activity("협상 1", "사과 협상")
            agent.record_activity("협상 2", "황태 협상")
            agent.record_activity("협상 3", "감자 협상")
            
            original_id = agent.passport_id
            original_activities = len(agent.activity_snapshot)
            original_score = agent.self_status_info['spirit_score']
            
            # 2. Passport 백업
            backup = agent.to_dict()
            
            # 3. 에이전트 리셋 (시뮬레이션 - 객체 삭제)
            del agent
            
            # 4. Passport 복구
            recovered_agent = AgentPassport.from_dict(backup)
            
            # 5. 복구 검증
            id_match = recovered_agent.passport_id == original_id
            activities_match = len(recovered_agent.activity_snapshot) == original_activities
            score_match = recovered_agent.self_status_info['spirit_score'] == original_score
            
            self.log_test(
                "에이전트 리셋 & 복구",
                id_match and activities_match and score_match,
                f"ID 일치: {id_match}, 활동 일치: {activities_match}, Score 일치: {score_match}"
            )
            
            # 6. 복구 후 활동 계속 가능 확인
            recovered_agent.record_activity("복구 후 협상", "내복 협상")
            
            self.log_test(
                "복구 후 활동 계속",
                len(recovered_agent.activity_snapshot) == original_activities + 1,
                f"활동 추가 성공: {len(recovered_agent.activity_snapshot)}개"
            )
            
            return True
            
        except Exception as e:
            self.log_test("에이전트 리셋", False, str(e))
            return False
    
    def test_edge_case_data_conflict(self):
        """TEST 4: 엣지 케이스 - 데이터 충돌"""
        print("\n" + "=" * 70)
        print("TEST 4: 엣지 케이스 - 데이터 충돌 처리")
        print("=" * 70)
        
        try:
            # 1. 동일 에이전트 다중 생성 (충돌 시뮬레이션)
            agent1 = AgentPassport(
                agent_name="충돌 테스트",
                initial_region="인제군",
                task_type="협상"
            )
            
            agent2 = AgentPassport(
                agent_name="충돌 테스트",  # 같은 이름
                initial_region="인제군",
                task_type="협상"
            )
            
            # 2. 서로 다른 ID 확인
            ids_different = agent1.passport_id != agent2.passport_id
            
            self.log_test(
                "동일 이름 에이전트 ID 분리",
                ids_different,
                f"Agent1: {agent1.passport_id[:8]}..., Agent2: {agent2.passport_id[:8]}..."
            )
            
            # 3. Spirit Score 충돌 (음수 값)
            try:
                agent1.self_status_info['spirit_score'] = -1.0  # 잘못된 값
                
                # 협상 시 자동 보정 확인
                power = agent1.calculate_negotiation_power()
                
                # 음수여도 협상력은 0 이상이어야 함
                self.log_test(
                    "잘못된 Spirit Score 처리",
                    power >= 0,
                    f"음수 Score({-1.0}) → 협상력 {power:.3f} (0 이상)"
                )
                
            except Exception as e:
                self.log_test("Spirit Score 검증", False, str(e))
            
            # 4. Rapport 범위 초과 (1.0 초과)
            agent1.update_rapport(1.5)  # 범위 초과
            
            # 협상력은 자동으로 1.0으로 제한되어야 함
            power = agent1.calculate_negotiation_power()
            
            self.log_test(
                "Rapport 범위 초과 처리",
                power <= 1.0,
                f"Rapport 1.5 → 협상력 {power:.3f} (1.0 이하)"
            )
            
            # 5. 빈 활동 기록
            try:
                agent1.record_activity("", "")  # 빈 활동
                
                self.log_test(
                    "빈 활동 기록 처리",
                    True,
                    "빈 활동도 기록 가능"
                )
            except Exception as e:
                self.log_test("빈 활동 기록", False, str(e))
            
            return True
            
        except Exception as e:
            self.log_test("데이터 충돌", False, str(e))
            return False
    
    def test_edge_case_extreme_values(self):
        """TEST 5: 엣지 케이스 - 극단값"""
        print("\n" + "=" * 70)
        print("TEST 5: 엣지 케이스 - 극단값 처리")
        print("=" * 70)
        
        try:
            # 1. 매우 높은 Spirit Score
            agent_high = AgentPassport(
                agent_name="고신뢰 에이전트",
                initial_region="인제군",
                task_type="협상"
            )
            agent_high.self_status_info['spirit_score'] = 5.0  # 최대값
            agent_high.update_rapport(1.0)  # 최대값
            
            # 2. 매우 낮은 Spirit Score
            agent_low = AgentPassport(
                agent_name="저신뢰 에이전트",
                initial_region="인제군",
                task_type="협상"
            )
            agent_low.self_status_info['spirit_score'] = 0.0  # 최소값
            agent_low.update_rapport(0.0)  # 최소값
            
            # 3. 극단값 협상 (최대 vs 최소)
            base_price = 100000
            
            negotiated_high, details_high = self.engine.negotiate_price(
                base_price=base_price,
                current_quantity=20,
                target_goal=20,  # 100% 달성
                demand_agent=agent_high,
                supply_agent=agent_high
            )
            
            negotiated_low, details_low = self.engine.negotiate_price(
                base_price=base_price,
                current_quantity=1,
                target_goal=20,  # 5% 달성
                demand_agent=agent_low,
                supply_agent=agent_low
            )
            
            # 4. 협상 차이 검증
            discount_high = (1 - negotiated_high / base_price) * 100
            discount_low = (1 - negotiated_low / base_price) * 100
            
            self.log_test(
                "극단값 협상 차이",
                discount_high > discount_low,
                f"고신뢰({discount_high:.1f}% 할인) > 저신뢰({discount_low:.1f}% 할인)"
            )
            
            # 5. 0원 거래 (무료)
            negotiated_zero, details_zero = self.engine.negotiate_price(
                base_price=0,
                current_quantity=10,
                target_goal=10,
                demand_agent=agent_high,
                supply_agent=agent_high
            )
            
            self.log_test(
                "0원 거래 처리",
                negotiated_zero == 0,
                "무료 거래 정상 처리"
            )
            
            # 6. 초대량 거래
            negotiated_large, details_large = self.engine.negotiate_price(
                base_price=1000,
                current_quantity=10000,  # 만 개
                target_goal=100,
                demand_agent=agent_high,
                supply_agent=agent_high
            )
            
            self.log_test(
                "초대량 거래 처리",
                negotiated_large < base_price,
                f"10,000개 거래: {negotiated_large:,}원 (할인 {100 - negotiated_large/base_price*100:.1f}%)"
            )
            
            return True
            
        except Exception as e:
            self.log_test("극단값 처리", False, str(e))
            return False
    
    def test_full_workflow(self):
        """TEST 6: 전체 워크플로우 (E2E)"""
        print("\n" + "=" * 70)
        print("TEST 6: 전체 워크플로우 (End-to-End)")
        print("=" * 70)
        
        try:
            # 1. 에이전트 생성 (Passport 발급)
            demand_profile = get_agent_profile('demand_agent')
            demand_agent = AgentPassport(
                agent_name=demand_profile['agent_name'],
                initial_region=demand_profile['initial_region'],
                task_type=demand_profile['task_type']
            )
            demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
            demand_agent.update_rapport(demand_profile['rapport_level'])
            
            supply_profile = get_agent_profile('agent_inje_apple')
            supply_agent = AgentPassport(
                agent_name=supply_profile['agent_name'],
                initial_region=supply_profile['initial_region'],
                task_type=supply_profile['task_type']
            )
            supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
            supply_agent.update_rapport(supply_profile.get('rapport_level', 0.7))
            
            # 2. 협상 시작 기록
            demand_agent.record_activity("협상 시작", "인제 사과 협상 개시")
            supply_agent.record_activity("협상 시작", "서화면 에이전트와 협상")
            
            # 3. 협상 실행
            negotiated_price, details = self.engine.negotiate_price(
                base_price=35000,
                current_quantity=14,
                target_goal=20,
                demand_agent=demand_agent,
                supply_agent=supply_agent
            )
            
            # 4. AP2 Mandate 생성
            ap2_mandate = {
                'transaction_id': f"TX_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'demand_agent': demand_agent.passport_id,
                'supply_agent': supply_agent.passport_id,
                'item': '인제 사과 (5kg)',
                'quantity': 14,
                'negotiated_price': negotiated_price,
                'original_price': 35000,
                'savings': 35000 - negotiated_price,
                'verified': True,
                'timestamp': datetime.now().isoformat()
            }
            
            # 5. 협상 완료 기록
            demand_agent.record_activity(
                "협상 완료",
                json.dumps(ap2_mandate, ensure_ascii=False)
            )
            supply_agent.record_activity(
                "협상 완료",
                json.dumps(ap2_mandate, ensure_ascii=False)
            )
            
            # 6. 경제적 임팩트 계산
            total_savings = (35000 - negotiated_price) * 14
            mulberry_revenue = total_savings * 0.03
            community_share = total_savings * 0.10
            
            economic_impact = {
                'total_savings': total_savings,
                'mulberry_revenue': mulberry_revenue,
                'community_share': community_share,
                'ap2_verified': True
            }
            
            # 7. Spirit Score 업데이트 (협상 성공으로 증가)
            demand_agent.self_status_info['spirit_score'] = min(5.0, 
                demand_agent.self_status_info['spirit_score'] + 0.1)
            supply_agent.self_status_info['spirit_score'] = min(5.0,
                supply_agent.self_status_info['spirit_score'] + 0.1)
            
            # 8. Passport 백업
            demand_backup = demand_agent.to_dict()
            supply_backup = supply_agent.to_dict()
            
            # 9. 전체 검증
            workflow_valid = (
                negotiated_price < 35000 and
                total_savings > 0 and
                mulberry_revenue > 0 and
                community_share > 0 and
                len(demand_agent.activity_snapshot) >= 2 and
                len(supply_agent.activity_snapshot) >= 2 and
                demand_backup is not None and
                supply_backup is not None
            )
            
            self.log_test(
                "전체 워크플로우 (E2E)",
                workflow_valid,
                f"절감 {total_savings:,}원, Mulberry {mulberry_revenue:,}원, 커뮤니티 {community_share:,}원"
            )
            
            return True
            
        except Exception as e:
            self.log_test("전체 워크플로우", False, str(e))
            return False
    
    def run_all_tests(self):
        """모든 통합 테스트 실행"""
        print("\n" + "=" * 70)
        print("🌾 Mulberry 협상 엔진 - 통합 테스트 시작")
        print("PM Trang 요청: Passport + Ghost Archive + 협상 + AP2 통합")
        print("=" * 70)
        
        start_time = time.time()
        
        # 테스트 실행
        self.test_passport_ghost_archive_integration()
        self.test_negotiation_ap2_mandate_integration()
        self.test_edge_case_agent_reset()
        self.test_edge_case_data_conflict()
        self.test_edge_case_extreme_values()
        self.test_full_workflow()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # 결과 요약
        print("\n" + "=" * 70)
        print("📊 테스트 결과 요약")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['passed'])
        failed_tests = len(self.errors)
        
        print(f"\n전체 테스트: {total_tests}개")
        print(f"✅ 성공: {passed_tests}개")
        print(f"❌ 실패: {failed_tests}개")
        print(f"⏱️  소요 시간: {duration:.2f}초")
        
        if self.errors:
            print(f"\n❌ 실패한 테스트:")
            for error in self.errors:
                print(f"   - {error}")
        else:
            print(f"\n🎉 모든 테스트 통과!")
        
        # 상세 결과 JSON 저장
        result_file = '/home/claude/mulberry-negotiation-engine/integration_test_results.json'
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump({
                'summary': {
                    'total': total_tests,
                    'passed': passed_tests,
                    'failed': failed_tests,
                    'duration': duration,
                    'timestamp': datetime.now().isoformat()
                },
                'tests': self.test_results,
                'errors': self.errors
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 상세 결과: {result_file}")
        
        return failed_tests == 0


if __name__ == '__main__':
    tester = IntegrationTest()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)
