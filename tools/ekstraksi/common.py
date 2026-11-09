import re, html, os
CS_RE = re.compile(rb'charset\s*=\s*["\']?([\w-]+)', re.I)
def decode(path, default='cp1256'):
    b = open(path, 'rb').read()
    m = CS_RE.search(b[:4000])
    cs = m.group(1).decode().lower() if m else None
    if b.startswith(b'\xef\xbb\xbf'): cs = 'utf-8'
    alias = {'iso-8859-1': 'cp1252', 'windows-1252': 'cp1252', 'windows-1256': 'cp1256', 'utf8': 'utf-8'}
    cs = alias.get(cs, cs)
    tried = [cs] if cs else []
    tried += ['utf-8', default]
    for enc in tried:
        try:
            return b.decode(enc), enc, 0
        except Exception:
            pass
    return b.decode(default, errors='replace'), default + '!replace', b.decode(default, errors='replace').count('�')
BLOCK_END = re.compile(r'(?i)<\s*(br|/p|/div|/td|/th|/tr|/h[1-6]|/li|/table|/blockquote|p|div|tr|li|h[1-6]|table|hr)\b[^>]*>')
def lines(text):
    t = re.sub(r'(?is)<!--.*?-->', ' ', text)
    t = re.sub(r'(?is)<(script|style|head|xml|title)\b.*?</\1\s*>', ' ', t)
    t = BLOCK_END.sub('\n', t)
    t = re.sub(r'(?s)<[^>]+>', ' ', t)
    t = html.unescape(t)
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', t)
    t = t.replace('\xa0', ' ').replace('‏', '').replace('‎', '').replace('﻿', '')
    out = []
    for ln in t.split('\n'):
        ln = re.sub(r'[ \t\r\f\v]+', ' ', ln).strip()
        if ln: out.append(ln)
    return out
def title_of(text):
    m = re.search(r'(?is)<title>(.*?)</title>', text)
    return re.sub(r'\s+', ' ', html.unescape(m.group(1))).strip() if m else ''
AR = re.compile(r'[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]')
LAT = re.compile(r'[A-Za-z]')
def arabic_ratio(s):
    a = len(AR.findall(s)); l = len(LAT.findall(s))
    return a / max(1, a + l)
def is_ar(s): return arabic_ratio(s) > 0.6

def parse_hhc(path):
    """Kembalikan {local_path_lower: [nama level1, level2, ...]} dari daftar isi CHM (.hhc)."""
    t, enc, bad = decode(path, 'cp1256')
    out = {}; order = []
    stack = []; depth = 0; last = None
    for m in re.finditer(r'(?is)<\s*(/?)ul\b[^>]*>|<object\b[^>]*text/sitemap[^>]*>(.*?)</object>', t):
        if m.group(0)[:3].lower().startswith('<ul') or re.match(r'(?i)<\s*ul', m.group(0)):
            if last is not None: stack.append(last)
            else: stack.append(None)
            last = None; continue
        if re.match(r'(?i)<\s*/ul', m.group(0)):
            if stack: stack.pop()
            last = None; continue
        body = m.group(2) or ''
        nm = re.search(r'(?is)name\s*=\s*"name"\s+value\s*=\s*"([^"]*)"', body)
        lc = re.search(r'(?is)name\s*=\s*"local"\s+value\s*=\s*"([^"]*)"', body)
        name = html.unescape(nm.group(1)).strip() if nm else ''
        chain = [s for s in stack if s] + [name]
        last = name
        if lc:
            loc = __import__('urllib.parse').parse.unquote(html.unescape(lc.group(1))).replace('\\', '/').split('#')[0].lower().lstrip('/')
            if loc not in out: out[loc] = chain; order.append(loc)
    return out, order
