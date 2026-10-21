# Har saytga joylashdan oldin ishga tushiriladi: python version.py
# index.html dagi importmap'ga har bir js fayl uchun mazmuniga qarab versiya (?v=...) yoziladi.
# Shunda brauzer o'zgargan fayllarni albatta yangidan yuklaydi, o'zgarmaganlarini keshdan oladi.
import hashlib, os, re

root = os.path.dirname(os.path.abspath(__file__))
h = lambda p: hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]
js = sorted(f for f in os.listdir(os.path.join(root, 'js')) if f.endswith('.js'))
lines = [f'  "./js/{f}": "./js/{f}?v={h(os.path.join(root, "js", f))}",' for f in js if f != 'main.js']
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
block = ('<script type="importmap">\n{ "imports": {\n'
         '  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",\n'
         '  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",\n'
         + '\n'.join(lines).rstrip(',') + '\n} }\n</script>')
s = re.sub(r'<script type="importmap">.*?</script>', block, s, count=1, flags=re.S)
s = re.sub(r'<script type="module" src="js/main\.js[^"]*"></script>', f'<script type="module" src="js/main.js?v={h(os.path.join(root, "js", "main.js"))}"></script>', s)
s = re.sub(r'href="css/style\.css[^"]*"', f'href="css/style.css?v={h(os.path.join(root, "css", "style.css"))}"', s)
open(p, 'w', encoding='utf-8').write(s)
print('versiyalar yangilandi:', len(js), 'ta js fayl')
