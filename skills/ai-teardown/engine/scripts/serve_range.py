# 支持 Range 的静态服务器：本地测互动版（音频/视频 seek）用。python3 scripts/serve_range.py <发布目录> <端口>
import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class H(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get("Range")
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)", rng); size = os.path.getsize(path)
        a = int(m.group(1)) if m.group(1) else 0; b = int(m.group(2)) if m.group(2) else size - 1
        b = min(b, size - 1); f = open(path, "rb"); f.seek(a)
        self.send_response(206); self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes"); self.send_header("Content-Range", f"bytes {a}-{b}/{size}")
        self.send_header("Content-Length", str(b - a + 1)); self.end_headers()
        self._remain = b - a + 1
        return f
    def copyfile(self, src, dst):
        n = getattr(self, "_remain", None)
        if n is None: return super().copyfile(src, dst)
        while n > 0:
            buf = src.read(min(65536, n))
            if not buf: break
            dst.write(buf); n -= len(buf)
        self._remain = None
os.chdir(sys.argv[1]); ThreadingHTTPServer(("127.0.0.1", int(sys.argv[2])), H).serve_forever()
