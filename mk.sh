#!/bin/bash
set -e
cd /root/caesar3d
# re-inject CSS into the template (it was inlined last pass)
python3 - <<'PY'
import re
s=open('tpl.html').read()
css=open('style.css').read()
s=re.sub(r'<style>.*?</style>', '<style>\n'+css+'\n</style>', s, count=1, flags=re.S)
open('tpl.html','w').write(s)
PY
./getthree.sh
python3 build.py
rm -f three_inline.js
