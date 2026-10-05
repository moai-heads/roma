curl -sf -o three.min.js https://unpkg.com/three@0.160.0/build/three.module.js
python3 -c "
s=open('three.min.js').read(); i=s.rindex('export {')
names=s[i+8:s.rindex('}')].strip()
open('three_inline.js','w').write(s[:i]+'\nwindow.THREE={'+names+'};\n')"
rm -f three.min.js
