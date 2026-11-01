"""Serveur local : fichiers statiques + /__session (identifiant unique par lancement).
La page compare cet identifiant à celui qu'elle a mémorisé et vide son cache s'il a changé.
Usage : python server.py [port]
"""
import json, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SESSION_ID = str(time.time_ns())

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Sans cet en-tête, le navigateur réutilise d'anciens fichiers .js/.css (cache heuristique) même après un F5
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/__session":
            body = json.dumps({"id": SESSION_ID}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"http://localhost:{port}  (session {SESSION_ID})")
ThreadingHTTPServer(("", port), Handler).serve_forever()
