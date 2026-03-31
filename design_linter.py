#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
아하플러스 v2 Design System Linter
사용법:
  검수만:        python design_linter.py --target ./src --rules ./design-rules.json
  자동 수정:     python design_linter.py --target ./src --rules ./design-rules.json --fix
  단일 파일:     python design_linter.py --target index.html --rules ./design-rules.json
  HTML 리포트:   python design_linter.py --target ./src --output report.html
"""

import os
import re
import json
import sys
import argparse
import datetime
from pathlib import Path
from collections import defaultdict

# ─── ANSI 색상 ───
R = '\033[91m'  # 빨강
G = '\033[92m'  # 초록
Y = '\033[93m'  # 노랑
B = '\033[94m'  # 파랑
C = '\033[96m'  # 시안
W = '\033[97m'  # 흰색
D = '\033[90m'  # 회색
RESET = '\033[0m'
BOLD = '\033[1m'

class Issue:
    def __init__(self, file, line, col, severity, category, message, suggestion=None, original=None, fixed=None):
        self.file = file
        self.line = line
        self.col = col
        self.severity = severity   # 'error' | 'warning' | 'info'
        self.category = category   # 'color' | 'typography' | 'component' | 'i18n' | 'prefix' | 'structure'
        self.message = message
        self.suggestion = suggestion
        self.original = original
        self.fixed = fixed

class DesignLinter:
    def __init__(self, rules_path):
        with open(rules_path, encoding='utf-8') as f:
            self.rules = json.load(f)
        self.issues = []
        self.fixed_count = 0
        self.allowed_colors = set(
            c.upper() for c in self.rules['colors']['allowed'].values()
            if c.startswith('#')
        )
        # rgba 허용값도 등록
        self.allowed_rgba = [
            'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.15)',
            'rgba(0,0,0,0.08)', 'rgba(97,97,255,0.1)',
        ]
        self.allowed_prefixes = list(self.rules['css_prefixes'].keys())

    # ─── 파일 수집 ───
    def collect_files(self, target):
        p = Path(target)
        files = []
        exts = {'.html', '.css', '.js'}
        if p.is_file() and p.suffix in exts:
            return [p]
        for ext in exts:
            files.extend(p.rglob(f'*{ext}'))
        # node_modules, .git 제외
        return [f for f in files if 'node_modules' not in str(f) and '.git' not in str(f)]

    def add_issue(self, file, line, col, severity, category, message, suggestion=None, original=None, fixed=None):
        self.issues.append(Issue(str(file), line, col, severity, category, message, suggestion, original, fixed))

    # ─── 색상 검사 ───
    def check_colors(self, content, filepath):
        lines = content.split('\n')
        # CSS 파일 또는 <style> 블록 추출
        css_blocks = []
        if filepath.endswith('.css'):
            css_blocks = [(content, 0)]
        else:
            for m in re.finditer(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE):
                css_blocks.append((m.group(1), content[:m.start()].count('\n')))
            # inline style
            for m in re.finditer(r'style=["\']([^"\']+)["\']', content):
                css_blocks.append((m.group(1), content[:m.start()].count('\n')))

        for css, base_line in css_blocks:
            for m in re.finditer(r'#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b', css):
                hex_val = '#' + m.group(1).upper()
                # 3자리 → 6자리 변환
                if len(m.group(1)) == 3:
                    h = m.group(1)
                    hex_val = '#' + h[0]*2 + h[1]*2 + h[2]*2
                if hex_val not in self.allowed_colors:
                    line_no = base_line + css[:m.start()].count('\n') + 1
                    closest = self._find_closest_color(hex_val)
                    self.add_issue(
                        filepath, line_no, m.start(),
                        'error', 'color',
                        f"허용되지 않은 색상: {hex_val}",
                        f"가장 가까운 허용 색상: {closest}",
                        hex_val, closest
                    )

    def _find_closest_color(self, hex_val):
        """허용 색상 중 가장 유사한 색상 반환"""
        try:
            r1 = int(hex_val[1:3], 16)
            g1 = int(hex_val[3:5], 16)
            b1 = int(hex_val[5:7], 16)
            best, best_dist = None, float('inf')
            for c in self.allowed_colors:
                if len(c) != 7: continue
                try:
                    r2 = int(c[1:3], 16)
                    g2 = int(c[3:5], 16)
                    b2 = int(c[5:7], 16)
                    d = (r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2
                    if d < best_dist:
                        best_dist = d
                        best = c
                except:
                    pass
            return best or '#6161FF'
        except:
            return '#6161FF'

    # ─── 타이포그래피 검사 ───
    def check_typography(self, content, filepath):
        # 폰트 패밀리 확인 - Pretendard 없이 다른 폰트만 쓰는 경우
        font_decls = re.findall(r'font-family\s*:\s*([^;]+);', content)
        for decl in font_decls:
            if 'inherit' in decl.lower(): continue
            if 'pretendard' not in decl.lower() and 'var(' not in decl.lower():
                line_no = content[:content.find(decl)].count('\n') + 1
                self.add_issue(
                    filepath, line_no, 0,
                    'warning', 'typography',
                    f"Pretendard 폰트 누락: font-family: {decl.strip()[:60]}",
                    "font-family에 'Pretendard'를 포함하세요"
                )

        # 허용되지 않은 font-size
        allowed_sizes = {'10px','11px','11.5px','12px','12.5px','13px','14px','15px','16px','17px','18px','20px','24px','32px','9px','8px'}
        for m in re.finditer(r'font-size\s*:\s*([\d.]+px)', content):
            size = m.group(1)
            if size not in allowed_sizes:
                line_no = content[:m.start()].count('\n') + 1
                self.add_issue(
                    filepath, line_no, 0,
                    'warning', 'typography',
                    f"비표준 font-size: {size}",
                    "디자인 가이드의 타이포그래피 스케일을 사용하세요 (10~18px 범위)"
                )

    # ─── 컴포넌트 구조 검사 ───
    def check_components(self, content, filepath):
        # 버튼 border-radius
        btn_rules = self.rules['components']['button']
        modal_radius = self.rules['components']['modal']['border_radius']

        # 모달 border-radius 검사
        for m in re.finditer(r'(modal|popup|overlay)[^{]*\{([^}]+)\}', content, re.IGNORECASE | re.DOTALL):
            style = m.group(2)
            radius_m = re.search(r'border-radius\s*:\s*([\d.]+px)', style)
            if radius_m:
                val = radius_m.group(1)
                if val not in ['16px', '14px', '12px']:
                    line_no = content[:m.start()].count('\n') + 1
                    self.add_issue(
                        filepath, line_no, 0,
                        'warning', 'component',
                        f"모달 border-radius: {val} (권장: 16px)",
                        "모달/팝업의 border-radius는 16px을 사용하세요"
                    )

        # 버튼 높이 검사
        for m in re.finditer(r'\.([\w-]*btn[\w-]*|[\w-]*button[\w-]*)\s*\{([^}]+)\}', content, re.IGNORECASE):
            style = m.group(2)
            height_m = re.search(r'height\s*:\s*([\d.]+px)', style)
            if height_m:
                val = height_m.group(1)
                if val not in ['28px', '30px', '32px', '34px', '36px', '18px', '22px', '26px', '24px', '20px', '16px', '14px']:
                    line_no = content[:m.start()].count('\n') + 1
                    self.add_issue(
                        filepath, line_no, 0,
                        'info', 'component',
                        f"버튼 높이 {val} — 표준: 36px(기본), 28~32px(소형)",
                        "버튼 높이 기준: 기본 36px, 소형 28~32px"
                    )

        # 탭 스타일 검사 (박스 테두리 방식 사용 여부)
        tab_matches = re.finditer(r'\.([\w-]*tab[\w-]*\.active|[\w-]*active\.[\w-]*tab[\w-]*)\s*\{([^}]+)\}', content)
        for m in tab_matches:
            style = m.group(2)
            if 'border-color' in style and 'border-bottom' not in style:
                line_no = content[:m.start()].count('\n') + 1
                self.add_issue(
                    filepath, line_no, 0,
                    'warning', 'component',
                    f"탭 활성 스타일이 박스 테두리 방식 — 밑줄 스타일 권장",
                    "active 탭: color:#6161FF; border-bottom: 2px solid #6161FF;"
                )

        # Primary 색상 오버레이 확인
        for m in re.finditer(r'rgba\(([^)]+)\)', content):
            val = 'rgba(' + m.group(1) + ')'
            val_norm = val.replace(' ', '')
            if not any(val_norm == a.replace(' ','') for a in self.allowed_rgba):
                # 흔한 shadow 값은 허용
                if '0,0,0' not in val and '97,97,255' not in val:
                    line_no = content[:m.start()].count('\n') + 1
                    self.add_issue(
                        filepath, line_no, 0,
                        'info', 'color',
                        f"비표준 rgba 값: {val}",
                        "허용 rgba: rgba(0,0,0,0.45) 오버레이 / rgba(97,97,255,0.1) 포커스링"
                    )

    # ─── i18n 검사 (HTML) ───
    def check_i18n(self, content, filepath):
        if not filepath.endswith('.html'): return
        i18n_rules = self.rules['i18n']

        # 한글이 포함된 텍스트 요소 중 data-i18n 없는 것 찾기
        # 버튼, span, label, td, th, div, p, h1~h6
        tags = ['button', 'span', 'label', 'td', 'th', 'div', 'p', 'a', 'h1', 'h2', 'h3', 'h4']
        for tag in tags:
            pattern = rf'<{tag}([^>]*)>((?:[^<]|\n)*?)</\w+>'
            for m in re.finditer(pattern, content, re.IGNORECASE):
                attrs = m.group(1)
                text = m.group(2).strip()
                # 한글 포함 여부
                if re.search(r'[\uAC00-\uD7A3]', text):
                    if 'data-i18n' not in attrs and 'data-ko' not in attrs:
                        # 동적 콘텐츠({{, ${) 제외
                        if '{{' not in text and '${' not in text:
                            line_no = content[:m.start()].count('\n') + 1
                            self.add_issue(
                                filepath, line_no, 0,
                                'warning', 'i18n',
                                f"i18n 속성 누락: <{tag}>{text[:30]}{'...' if len(text)>30 else ''}",
                                f'data-i18n="ns.key" data-ko="{text[:20]}" data-en="..." 추가 필요'
                            )

        # data-i18n 키 형식 검사 (namespace.key)
        for m in re.finditer(r'data-i18n=["\']([^"\']+)["\']', content):
            key = m.group(1)
            if '.' not in key:
                line_no = content[:m.start()].count('\n') + 1
                self.add_issue(
                    filepath, line_no, 0,
                    'error', 'i18n',
                    f"i18n 키 형식 오류: '{key}' — 'namespace.key' 형식이어야 함",
                    f"예: 'common.{key}' 또는 적절한 네임스페이스 사용"
                )

        # 네임스페이스 검사
        ns_list = i18n_rules['namespaces']
        for m in re.finditer(r'data-i18n=["\']([^"\'\.]+)\.[^"\']+["\']', content):
            ns = m.group(1)
            if ns not in ns_list:
                line_no = content[:m.start()].count('\n') + 1
                self.add_issue(
                    filepath, line_no, 0,
                    'warning', 'i18n',
                    f"미등록 i18n 네임스페이스: '{ns}'",
                    f"허용 네임스페이스: {', '.join(ns_list)}"
                )

    # ─── CSS Prefix 검사 ───
    def check_prefixes(self, content, filepath):
        if filepath.endswith('.js'): return

        # 클래스 정의에서 prefix 없는 커스텀 클래스 찾기
        # (일반적인 유틸리티 클래스명은 제외)
        common_classes = {
            'active', 'show', 'hide', 'hidden', 'open', 'closed', 'disabled',
            'selected', 'checked', 'error', 'success', 'warning', 'info',
            'flex', 'block', 'grid', 'row', 'col', 'container', 'wrapper',
            'header', 'footer', 'body', 'content', 'main', 'nav', 'sidebar',
            'left', 'right', 'center', 'top', 'bottom', 'inner', 'outer',
            'bold', 'italic', 'small', 'large', 'full', 'half',
            'btn', 'button', 'input', 'select', 'label', 'form',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
            'modal', 'popup', 'overlay', 'backdrop', 'tooltip',
            'badge', 'tag', 'chip', 'pill', 'avatar',
            'icon', 'img', 'image', 'logo', 'text', 'title',
            'list', 'item', 'link', 'card', 'panel', 'section',
            'loading', 'spinner', 'empty', 'placeholder',
            'mega-menu', 'mega-col', 'mci', 'gnb', 'topnav',
        }

        valid_prefix_patterns = [re.compile(r'^' + re.escape(p)) for p in self.allowed_prefixes]

        if filepath.endswith('.css'):
            for m in re.finditer(r'\.([\w][\w-]*)\s*[\{,]', content):
                cls = m.group(1).lower()
                # prefix 있는 클래스
                has_valid_prefix = any(p.match(cls) for p in valid_prefix_patterns)
                # 공통 유틸리티
                is_common = cls in common_classes or cls.startswith(('js-', 'is-', 'has-', 'no-'))
                # 짧은 클래스 (2글자 이하)
                is_short = len(cls) <= 2

                if not has_valid_prefix and not is_common and not is_short:
                    if '-' in cls:  # 복합 클래스만 검사
                        parts = cls.split('-')
                        if parts[0] not in common_classes and len(parts[0]) > 2:
                            line_no = content[:m.start()].count('\n') + 1
                            suggested_prefix = self._suggest_prefix(cls)
                            self.add_issue(
                                filepath, line_no, 0,
                                'info', 'prefix',
                                f"prefix 없는 커스텀 클래스: .{cls}",
                                f"화면별 prefix 사용 권장: .{suggested_prefix}{cls}"
                            )

    def _suggest_prefix(self, cls):
        """클래스명으로 prefix 추측"""
        hints = {
            'modal': 'sm-', 'popup': 'sm-', 'sales': 'sm-',
            'register': 'sr-', 'reg': 'sr-',
            'revenue': 'rv-', 'summary': 'rv-',
            'history': 'sh-', 'hist': 'sh-',
            'customer': 'cl-', 'client': 'cl-', 'cust': 'cl-',
            'reservation': 'rh-', 'booking': 'rh-',
            'deposit': 'dp-',
            'setting': 'st-', 'setup': 'st-',
            'detail': 'sd-', 'sale': 'sd-',
            'dashboard': 'db-', 'board': 'db-',
            'print': 'pp-', 'preview': 'pp-',
            'home': 'hm-',
            'holiday': 'hol-',
            'service': 'sv-',
        }
        for hint, prefix in hints.items():
            if hint in cls.lower():
                return prefix
        return 'sm-'  # 기본값

    # ─── 자동 수정 ───
    def apply_fixes(self, content, issues):
        fixed = content
        replacements = []

        for issue in issues:
            if issue.original and issue.fixed and issue.category == 'color':
                replacements.append((issue.original, issue.fixed))

        # 색상 교체 (중복 제거)
        seen = set()
        for orig, fix in replacements:
            key = (orig, fix)
            if key not in seen:
                seen.add(key)
                fixed = fixed.replace(orig, fix)
                self.fixed_count += 1

        return fixed

    # ─── HTML 리포트 생성 ───
    def generate_html_report(self, output_path):
        errors = [i for i in self.issues if i.severity == 'error']
        warnings = [i for i in self.issues if i.severity == 'warning']
        infos = [i for i in self.issues if i.severity == 'info']

        by_file = defaultdict(list)
        for issue in self.issues:
            by_file[issue.file].append(issue)

        by_cat = defaultdict(list)
        for issue in self.issues:
            by_cat[issue.category].append(issue)

        sev_color = {'error': '#F06060', 'warning': '#F5A623', 'info': '#378ADD'}
        cat_label = {'color': '🎨 색상', 'typography': '🔤 타이포그래피', 'component': '🧩 컴포넌트', 'i18n': '🌐 i18n', 'prefix': '🏷️ CSS Prefix', 'structure': '🏗️ 구조'}

        rows = ''
        for issue in self.issues:
            sug = f'<br><small style="color:#43A047">💡 {issue.suggestion}</small>' if issue.suggestion else ''
            rows += f'''<tr>
              <td><span style="background:{sev_color.get(issue.severity,"#ccc")};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">{issue.severity.upper()}</span></td>
              <td style="color:#616161;font-size:12px">{cat_label.get(issue.category, issue.category)}</td>
              <td style="font-size:12px;color:#757575">{os.path.basename(issue.file)}<br><span style="color:#BDBDBD">L{issue.line}</span></td>
              <td style="font-size:13px">{issue.message}{sug}</td>
            </tr>'''

        html = f'''<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<title>아하플러스 v2 Design Linter Report</title>
<style>
body{{font-family:'Pretendard',-apple-system,sans-serif;background:#F5F4F1;margin:0;padding:24px;color:#212121}}
.wrap{{max-width:1100px;margin:0 auto}}
.header{{background:#6161FF;color:#fff;padding:24px 32px;border-radius:12px;margin-bottom:24px}}
.header h1{{margin:0 0 4px;font-size:22px}}
.header p{{margin:0;font-size:13px;opacity:0.8}}
.summary{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}}
.card{{background:#fff;border-radius:10px;padding:20px;text-align:center;border:1px solid #E0E0E0}}
.card .num{{font-size:32px;font-weight:700;line-height:1}}
.card .lbl{{font-size:12px;color:#757575;margin-top:4px}}
.section{{background:#fff;border-radius:10px;border:1px solid #E0E0E0;overflow:hidden;margin-bottom:16px}}
.sec-title{{padding:14px 20px;background:#F7F7FF;border-bottom:1px solid #E0E0E0;font-size:14px;font-weight:700;color:#6161FF}}
table{{width:100%;border-collapse:collapse}}
th{{background:#F7F7FF;padding:8px 14px;font-size:11px;font-weight:600;color:#616161;text-align:left;border-bottom:1px solid #E0E0E0}}
td{{padding:10px 14px;border-bottom:1px solid #F0F0F0;vertical-align:top}}
tr:last-child td{{border-bottom:none}}
.empty{{padding:20px;text-align:center;color:#BDBDBD;font-size:13px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🔍 아하플러스 v2 Design System Linter</h1>
    <p>검수 일시: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")} | 총 파일: {len(by_file)}개</p>
  </div>
  <div class="summary">
    <div class="card"><div class="num" style="color:#F06060">{len(errors)}</div><div class="lbl">🔴 Errors</div></div>
    <div class="card"><div class="num" style="color:#F5A623">{len(warnings)}</div><div class="lbl">🟡 Warnings</div></div>
    <div class="card"><div class="num" style="color:#378ADD">{len(infos)}</div><div class="lbl">🔵 Info</div></div>
    <div class="card"><div class="num" style="color:#43A047">{len(self.issues)}</div><div class="lbl">📋 Total</div></div>
  </div>

  <div class="section">
    <div class="sec-title">📋 전체 이슈 목록</div>
    {"<table><thead><tr><th>심각도</th><th>카테고리</th><th>파일 / 라인</th><th>내용</th></tr></thead><tbody>" + rows + "</tbody></table>" if self.issues else '<div class="empty">✅ 이슈가 없습니다!</div>'}
  </div>
</div>
</body></html>'''

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

    # ─── 콘솔 출력 ───
    def print_report(self):
        errors   = [i for i in self.issues if i.severity == 'error']
        warnings = [i for i in self.issues if i.severity == 'warning']
        infos    = [i for i in self.issues if i.severity == 'info']

        print(f"\n{BOLD}{'─'*60}{RESET}")
        print(f"{BOLD}  아하플러스 v2 Design System Linter 결과{RESET}")
        print(f"{'─'*60}{RESET}")

        by_file = defaultdict(list)
        for issue in self.issues:
            by_file[issue.file].append(issue)

        for filepath, issues in sorted(by_file.items()):
            print(f"\n{B}📄 {os.path.basename(filepath)}{RESET} {D}({filepath}){RESET}")
            for issue in issues:
                icon = f"{R}✖{RESET}" if issue.severity == 'error' else f"{Y}⚠{RESET}" if issue.severity == 'warning' else f"{B}ℹ{RESET}"
                print(f"  {icon}  {W}L{issue.line}{RESET}  {D}[{issue.category}]{RESET}  {issue.message}")
                if issue.suggestion:
                    print(f"     {G}💡 {issue.suggestion}{RESET}")

        print(f"\n{'─'*60}")
        print(f"  {R}Errors: {len(errors)}{RESET}   {Y}Warnings: {len(warnings)}{RESET}   {B}Info: {len(infos)}{RESET}   합계: {len(self.issues)}")
        if self.fixed_count > 0:
            print(f"  {G}✅ 자동 수정 완료: {self.fixed_count}건{RESET}")
        print(f"{'─'*60}\n")

    # ─── 메인 실행 ───
    def run(self, target, fix=False, output=None):
        files = self.collect_files(target)
        print(f"{C}🔍 검수 시작: {len(files)}개 파일{RESET}")

        for filepath in files:
            try:
                with open(filepath, encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                print(f"{R}파일 읽기 실패: {filepath} - {e}{RESET}")
                continue

            fp = str(filepath)
            self.check_colors(content, fp)
            self.check_typography(content, fp)
            self.check_components(content, fp)
            self.check_i18n(content, fp)
            self.check_prefixes(content, fp)

            if fix:
                file_issues = [i for i in self.issues if i.file == fp]
                fixed_content = self.apply_fixes(content, file_issues)
                if fixed_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(fixed_content)

        self.print_report()

        if output:
            self.generate_html_report(output)
            print(f"{G}📊 HTML 리포트 저장: {output}{RESET}\n")

        # 종료 코드: error 있으면 1, 없으면 0
        errors = [i for i in self.issues if i.severity == 'error']
        return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(
        description='아하플러스 v2 Design System Linter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python design_linter.py --target ./src
  python design_linter.py --target index.html --fix
  python design_linter.py --target ./src --output report.html
  python design_linter.py --target ./src --rules ./design-rules.json --fix
        """
    )
    parser.add_argument('--target', required=True, help='검수 대상 (파일 또는 디렉터리)')
    parser.add_argument('--rules', default='./design-rules.json', help='규칙 JSON 파일 경로')
    parser.add_argument('--fix', action='store_true', help='자동 수정 적용')
    parser.add_argument('--output', help='HTML 리포트 저장 경로 (예: report.html)')
    parser.add_argument('--severity', choices=['error','warning','info'], help='최소 심각도 필터')

    args = parser.parse_args()

    if not os.path.exists(args.rules):
        print(f"{R}규칙 파일을 찾을 수 없습니다: {args.rules}{RESET}")
        sys.exit(1)

    if not os.path.exists(args.target):
        print(f"{R}대상을 찾을 수 없습니다: {args.target}{RESET}")
        sys.exit(1)

    linter = DesignLinter(args.rules)
    exit_code = linter.run(args.target, fix=args.fix, output=args.output)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
