# O'yinni kompyuterda ishga tushirish uchun oddiy server (kesh o'chirilgan).
# Ishlatish: python server.py   ->  http://localhost:8765
import http.server, socketserver, os, sys, webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        url = f'http://localhost:{PORT}'
        print(f"Tom and Jerry ishlayapti: {url}  (to'xtatish: Ctrl+C)")
        if '--open' in sys.argv:
            webbrowser.open(url)
        httpd.serve_forever()
