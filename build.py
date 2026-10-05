# There used to be two artifacts: index.html (what GitHub Pages serves) and roma.html
# (what every test loaded). They silently drifted, and the live site ran a build from
# three hours earlier while all the tests passed against the fresh one. One artifact now.
import sys
body = ''.join(open(f'p{i}.js').read() for i in range(1,9))
three = open('three_inline.js').read()
tpl = open('tpl.html').read()
html = tpl.replace('/*THREE*/', three).replace('/*BODY*/', body)
for name in ('index.html', 'roma.html'):
    open(name, 'w').write(html)
print('ok', len(body))
