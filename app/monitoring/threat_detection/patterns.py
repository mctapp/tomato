# app/monitoring/threat_detection/patterns.py
from enum import Enum
from typing import List, Dict, Pattern
import re

class AttackType(Enum):
    """공격 유형"""
    SQL_INJECTION = "sql_injection"
    XSS = "cross_site_scripting"
    PATH_TRAVERSAL = "path_traversal"
    COMMAND_INJECTION = "command_injection"
    LDAP_INJECTION = "ldap_injection"
    XXE = "xml_external_entity"
    BRUTE_FORCE = "brute_force"
    CREDENTIAL_STUFFING = "credential_stuffing"
    SESSION_HIJACKING = "session_hijacking"
    CSRF = "cross_site_request_forgery"
    FILE_UPLOAD = "malicious_file_upload"
    DOS = "denial_of_service"
    SCANNER = "vulnerability_scanner"

class AttackPattern:
    """공격 패턴 정의"""
    
    # SQL Injection 패턴
    SQL_INJECTION_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop|create)\b.*\b(from|where|table)\b)",
        r"(;|'|\")?.*\b(or|and)\b.*(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*')",
        r"(;|'|\")?\s*(--|#|/\*)",
        r"(\b(exec|execute|cast|convert|declare)\b)",
        r"(waitfor\s+delay|benchmark\s*\(|sleep\s*\()",
    ]
    
    # XSS 패턴
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:\s*[^\"']+",
        r"on\w+\s*=\s*[\"'][^\"']+[\"']",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<img[^>]*onerror[^>]*>",
    ]
    
    # Path Traversal 패턴
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\.(/|\\)",
        r"\.\./\.\./",
        r"\.\.\\\.\.\\",
        r"%2e%2e[/\\]",
        r"%252e%252e[/\\]",
        r"\.\./|\.\.\\",
    ]
    
    # Command Injection 패턴
    COMMAND_INJECTION_PATTERNS = [
        r";\s*\w+\s*[|<>]",
        r"[|;&].*\b(cat|ls|wget|curl|bash|sh|cmd|powershell)\b",
        r"`[^`]+`",
        r"\$\([^)]+\)",
        r"\b(system|exec|popen|proc_open|shell_exec|eval|assert)\s*\(",
    ]
    
    # 스캐너 User-Agent
    SCANNER_USER_AGENTS = [
        "sqlmap", "nikto", "nmap", "masscan", "burp", "zap",
        "acunetix", "nessus", "openvas", "metasploit", "wpscan",
        "dirb", "gobuster", "ffuf", "hydra", "medusa"
    ]
    
    @classmethod
    def compile_patterns(cls) -> Dict[AttackType, List[Pattern]]:
        """패턴 컴파일"""
        return {
            AttackType.SQL_INJECTION: [
                re.compile(p, re.IGNORECASE) for p in cls.SQL_INJECTION_PATTERNS
            ],
            AttackType.XSS: [
                re.compile(p, re.IGNORECASE) for p in cls.XSS_PATTERNS
            ],
            AttackType.PATH_TRAVERSAL: [
                re.compile(p, re.IGNORECASE) for p in cls.PATH_TRAVERSAL_PATTERNS
            ],
            AttackType.COMMAND_INJECTION: [
                re.compile(p, re.IGNORECASE) for p in cls.COMMAND_INJECTION_PATTERNS
            ],
        }
    
    @classmethod
    def get_severity(cls, attack_type: AttackType) -> str:
        """공격 유형별 심각도"""
        severity_map = {
            AttackType.SQL_INJECTION: "CRITICAL",
            AttackType.XSS: "HIGH",
            AttackType.PATH_TRAVERSAL: "HIGH",
            AttackType.COMMAND_INJECTION: "CRITICAL",
            AttackType.LDAP_INJECTION: "HIGH",
            AttackType.XXE: "HIGH",
            AttackType.BRUTE_FORCE: "MEDIUM",
            AttackType.CREDENTIAL_STUFFING: "HIGH",
            AttackType.SESSION_HIJACKING: "CRITICAL",
            AttackType.CSRF: "MEDIUM",
            AttackType.FILE_UPLOAD: "HIGH",
            AttackType.DOS: "HIGH",
            AttackType.SCANNER: "LOW",
        }
        return severity_map.get(attack_type, "MEDIUM")
