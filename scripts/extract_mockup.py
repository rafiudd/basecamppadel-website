import re, json, gzip, base64, pathlib, sys

path = pathlib.Path(r"C:\Users\LENOVO\Downloads\Basecamp Padel — Full Site.html")
if not path.exists():
    downloads = pathlib.Path.home() / 'Downloads'
    matches = list(downloads.glob('*Basecamp*Full*Site*.html'))
    if not matches:
        raise FileNotFoundError(f'Could not find mockup HTML in {downloads}')
    path = matches[0]

text = path.read_text(encoding='utf-8')
match = re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.S)
if not match:
    raise RuntimeError('Manifest not found')
manifest = json.loads(match.group(1))
output_lines = []
output_lines.append(f'entries {len(manifest)}')
for uid, entry in manifest.items():
    if entry.get('mime') != 'text/html':
        continue
    try:
        raw = base64.b64decode(entry['data'])
        dec = gzip.decompress(raw)
        s = dec.decode('utf-8', 'replace')
        title = re.search(r'<title>(.*?)</title>', s, re.S)
        title_text = title.group(1).strip() if title else ''
        if 'Buat Event' in title_text or 'Kompetisi · Format' in title_text or ('Event' in title_text and 'Admin' in title_text):
            out = f'{uid} :: {title_text}\n'
            template_match = re.search(r'<script type="__bundler/template">(.*?)</script>', s, re.S)
            if template_match:
                try:
                    template = json.loads(template_match.group(1))
                    out += str(template[:2500]) + '\n'
                except Exception as inner:
                    out += template_match.group(1)[:2500] + '\n'
            output_lines.append(out)
            output_lines.append('=' * 80)
    except Exception as e:
        output_lines.append(f'ERR {uid} {e}')

out_path = pathlib.Path(__file__).with_name('mockup_event_snippets_utf8.txt')
out_path.write_text('\n'.join(output_lines), encoding='utf-8')
print(f'Wrote {out_path}')
