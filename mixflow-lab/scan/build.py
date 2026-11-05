"""Construit l'application mobile autonome : injecte le jeu de données fictif dans le gabarit."""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(here, '..', 'src', 'data', 'dataset.json')))
tpl = open(os.path.join(here, 'app.template.html')).read()
jsqr = open(os.path.join(here, 'vendor', 'jsQR.js')).read().replace('</script', '<\\/script')
out = tpl.replace('__JSQR__', jsqr).replace('__DATASET__', json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
os.makedirs(os.path.join(here, '..', 'dist-single'), exist_ok=True)
open(os.path.join(here, '..', 'dist-single', 'mixflow-scan.html'), 'w').write(out)
print('dist-single/mixflow-scan.html', round(len(out) / 1024), 'Ko')
