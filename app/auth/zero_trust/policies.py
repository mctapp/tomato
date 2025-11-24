# app/auth/zero_trust/policies.py
from typing import Dict, List, Optional
from app.auth.zero_trust.context import AuthContext, RiskLevel

class PolicyRule:
    def __init__(self, name: str, condition: Dict, action: Dict):
        self.name = name
        self.condition = condition
        self.action = action
    
    def evaluate(self, context: AuthContext, risk_analysis: Dict) -> bool:
        """규칙 평가"""
        # 조건 검사 로직
        return self._check_condition(context, risk_analysis)

class PolicyEngine:
    def __init__(self):
        self.policies = self._load_policies()
    
    async def evaluate_access(
        self,
        context: AuthContext,
        risk_analysis: Dict
    ) -> Dict:
        """접근 정책 평가"""
        # 적용 가능한 정책 찾기
        applicable_policies = self._find_applicable_policies(context)
        
        # 각 정책 평가
        decisions = []
        for policy in applicable_policies:
            decision = await self._evaluate_policy(policy, context, risk_analysis)
            decisions.append(decision)
        
        # 최종 결정 (가장 제한적인 것 적용)
        final_decision = self._combine_decisions(decisions)
        
        return final_decision
    
    def _load_policies(self) -> List[PolicyRule]:
        """정책 로드"""
        return [
            # 고위험 접근 차단
            PolicyRule(
                name="block_high_risk",
                condition={
                    "risk_level": ["HIGH", "CRITICAL"],
                    "resource_sensitivity": ["HIGH", "CRITICAL"]
                },
                action={"decision": "DENY", "reason": "High risk detected"}
            ),
            
            # 관리자 MFA 필수
            PolicyRule(
                name="admin_mfa_required",
                condition={
                    "user_role": ["ADMIN", "SUPER_ADMIN"],
                    "mfa_verified": False
                },
                action={"decision": "REQUIRE_MFA", "reason": "Admin requires MFA"}
            ),
            
            # 신뢰하지 않는 디바이스에서 민감한 작업 차단
            PolicyRule(
                name="untrusted_device_sensitive_action",
                condition={
                    "device_trusted": False,
                    "action": ["DELETE", "MODIFY", "EXPORT"]
                },
                action={"decision": "DENY", "reason": "Sensitive action from untrusted device"}
            ),
            
            # 비정상 위치에서 추가 인증
            PolicyRule(
                name="unusual_location_verification",
                condition={
                    "risk_factors": ["Unusual location"],
                    "risk_score": {"$gte": 0.5}
                },
                action={"decision": "REQUIRE_VERIFICATION", "method": "EMAIL"}
            )
        ]
    
    async def _evaluate_policy(
        self,
        policy: PolicyRule,
        context: AuthContext,
        risk_analysis: Dict
    ) -> Dict:
        """개별 정책 평가"""
        if policy.evaluate(context, risk_analysis):
            return {
                "policy": policy.name,
                "matched": True,
                "action": policy.action
            }
        
        return {
            "policy": policy.name,
            "matched": False,
            "action": {"decision": "ALLOW"}
        }
    
    def _combine_decisions(self, decisions: List[Dict]) -> Dict:
        """여러 정책 결정 통합"""
        # 우선순위: DENY > REQUIRE_MFA > REQUIRE_VERIFICATION > ALLOW
        priority_order = {
            "DENY": 0,
            "REQUIRE_MFA": 1,
            "REQUIRE_VERIFICATION": 2,
            "ALLOW": 3
        }
        
        # 가장 제한적인 결정 선택
        final_decision = {"decision": "ALLOW", "policies": []}
        
        for decision in decisions:
            if decision["matched"]:
                action = decision["action"]["decision"]
                if priority_order.get(action, 3) < priority_order.get(final_decision["decision"], 3):
                    final_decision = decision["action"]
                    final_decision["policy_name"] = decision["policy"]
                
                final_decision["policies"].append(decision["policy"])
        
        return final_decision
