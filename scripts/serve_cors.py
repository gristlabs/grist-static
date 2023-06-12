"""
Serve the `page` directory similar to `python -m http.server`
but with CORS headers to allow cross-origin requests
and on both ports 3031 and 3032 to test the cross-origin behavior.

Visit localhost:3031/page/index_cors.html to test.
index_cors.html is a copy of index.html that loads bootstrap.js
from localhost:3032 instead of a relative URL (i.e. the same origin).
"""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


class MyHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


for port in [3031, 3032]:
    server = ThreadingHTTPServer(
        ("localhost", port),
        partial(MyHTTPRequestHandler, directory=Path(__file__).parent.parent),
    )
    Thread(target=server.serve_forever).start()
