"""シーンの連続フレームを撮ってコンタクトシートにする（開発用）

使い方:
  python apps/capture.py <slug> [--n 12] [--t0 0] [--t1 <duration>] [--w 480] [--h 360] [--out DIR]
出力: <out>/<slug>.png（フレームを格子状に並べた 1 枚画像）
ローカル HTTP サーバーはスクリプトが自動で立てる。
"""
import argparse, http.server, io, os, socketserver, sys, threading
from functools import partial
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serve():
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a, **k: None
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slugs', nargs='+')
    ap.add_argument('--n', type=int, default=12)
    ap.add_argument('--t0', type=float, default=0)
    ap.add_argument('--t1', type=float, default=None)
    ap.add_argument('--w', type=int, default=480)
    ap.add_argument('--h', type=int, default=360)
    ap.add_argument('--cols', type=int, default=4)
    ap.add_argument('--out', default=os.path.join(ROOT, 'apps', '_frames'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    httpd = serve()
    port = httpd.server_address[1]
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for slug in a.slugs:
            pg = b.new_page(viewport={'width': a.w, 'height': a.h})
            errs = []
            pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
            pg.goto(f'http://127.0.0.1:{port}/apps/preview.html?cap&slug={slug}&w={a.w}&h={a.h}')
            try:
                pg.wait_for_function('window.__ready === true', timeout=30000)
            except Exception:
                print(slug, 'FAILED to load'); print('\n'.join(errs)); continue
            dur = pg.evaluate('window.__duration')
            t1 = a.t1 if a.t1 is not None else dur
            n = a.n
            ts = [a.t0 + (t1 - a.t0) * i / (n if a.t1 is None else max(1, n - 1)) for i in range(n)]
            frames = []
            for t in ts:
                pg.evaluate(f'window.__renderAt({t})')
                png = pg.locator('#c').screenshot()
                frames.append((t, Image.open(io.BytesIO(png)).convert('RGB')))
            cols = min(a.cols, n)
            rows = (n + cols - 1) // cols
            fw, fh = frames[0][1].size
            sheet = Image.new('RGB', (cols * fw + (cols + 1) * 6, rows * fh + (rows + 1) * 6), (60, 50, 45))
            d = ImageDraw.Draw(sheet)
            for i, (t, im) in enumerate(frames):
                x = 6 + (i % cols) * (fw + 6); y = 6 + (i // cols) * (fh + 6)
                sheet.paste(im, (x, y))
                d.rectangle([x, y, x + 58, y + 16], fill=(0, 0, 0))
                d.text((x + 4, y + 3), f't={t:.2f}', fill=(255, 255, 255))
            path = os.path.join(a.out, f'{slug}.png')
            sheet.save(path)
            print(slug, 'duration', dur, '->', path)
            if errs: print('\n'.join(errs[:20]))
            pg.close()
        b.close()
    httpd.shutdown()

if __name__ == '__main__':
    main()
