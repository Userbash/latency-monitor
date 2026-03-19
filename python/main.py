import os
import asyncio
import socket
import sys
import threading

import uvicorn
from PySide6.QtCore import QTimer, Qt, QUrl
from PySide6.QtGui import QDesktopServices, QKeySequence, QShortcut
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PySide6.QtWebEngineWidgets import QWebEngineView

from server import app as backend_app
from server import start_server


def configure_qt_for_linux() -> None:
    """Set Wayland-first defaults while keeping xcb fallback for Linux desktops."""
    if sys.platform != "linux":
        return

    os.environ.setdefault("QT_QPA_PLATFORM", "wayland;xcb")
    os.environ.setdefault("QT_AUTO_SCREEN_SCALE_FACTOR", "1")

    chromium_flags = os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
    required_flags = [
        "--ozone-platform-hint=auto",
        "--enable-features=UseOzonePlatform,WaylandWindowDecorations",
    ]

    for flag in required_flags:
        if flag not in chromium_flags:
            chromium_flags = f"{chromium_flags} {flag}".strip()

    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = chromium_flags

    # Helps containers and restricted environments where Chromium sandbox is unavailable.
    os.environ.setdefault("QTWEBENGINE_DISABLE_SANDBOX", "1")

class MainWindow(QMainWindow):
    def __init__(self, server_port: int):
        super().__init__()
        self.server_port = server_port
        self.load_attempts = 0
        self.setWindowTitle("Esports Network Monitor (Qt Wrapper)")
        self.resize(1200, 800)

        # Create Central Widget
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)
        self.layout.setContentsMargins(0, 0, 0, 0)

        # Create WebEngineView
        self.browser = QWebEngineView()
        self.browser.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        self.layout.addWidget(self.browser)

        self.browser.page().newWindowRequested.connect(self.handle_new_window_request)
        self.devtools = None

        self.shortcut_devtools = QShortcut(QKeySequence("F12"), self)
        self.shortcut_devtools.activated.connect(self.toggle_devtools)

        self.shortcut_devtools_alt = QShortcut(QKeySequence("Ctrl+Shift+I"), self)
        self.shortcut_devtools_alt.activated.connect(self.toggle_devtools)

        self.shortcut_reload = QShortcut(QKeySequence("Ctrl+R"), self)
        self.shortcut_reload.activated.connect(self.browser.reload)

        # Load the local server
        # We use a timer to give the server a moment to start
        QTimer.singleShot(500, self.load_page)

    def toggle_devtools(self):
        if self.devtools is None:
            self.devtools = QWebEngineView(self)
            self.devtools.setWindowTitle("DevTools")
            self.devtools.resize(1100, 700)
            self.browser.page().setDevToolsPage(self.devtools.page())

        if self.devtools.isVisible():
            self.devtools.hide()
            return

        self.devtools.show()
        self.devtools.raise_()
        self.devtools.activateWindow()

    def handle_new_window_request(self, request):
        # Open target="_blank" and window.open links in system browser.
        QDesktopServices.openUrl(request.requestedUrl())

    def closeEvent(self, event):
        if self.devtools and self.devtools.isVisible():
            self.devtools.close()
        super().closeEvent(event)

    def is_server_alive(self) -> bool:
        try:
            with socket.create_connection(("127.0.0.1", self.server_port), timeout=0.2):
                return True
        except OSError:
            return False

    def load_page(self):
        if not self.is_server_alive():
            self.load_attempts += 1
            if self.load_attempts < 30:
                QTimer.singleShot(250, self.load_page)
                return

            self.browser.setHtml(
                "<h2>Backend unavailable</h2><p>Could not start local API server.</p>"
            )
            return

        url = QUrl(f"http://localhost:{self.server_port}")
        self.browser.setUrl(url)
        print("Loaded URL:", url.toString())

def run_server(server_port: int):
    # Legacy fallback: run FastAPI in a dedicated thread.
    try:
        start_server(host="127.0.0.1", port=server_port)
    except Exception as e:
        print(f"Server Error: {e}")


async def run_server_with_qasync(server_port: int, stop_event: asyncio.Event) -> None:
    """Run FastAPI inside the shared Qt/asyncio loop to avoid extra server threads."""
    config = uvicorn.Config(
        backend_app,
        host="127.0.0.1",
        port=server_port,
        log_level="info",
        access_log=False,
        lifespan="off",
    )
    server = uvicorn.Server(config)

    async def watch_for_shutdown() -> None:
        await stop_event.wait()
        server.should_exit = True

    await asyncio.gather(server.serve(), watch_for_shutdown())


def resolve_backend_port(preferred_port: int = 8000) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind(("127.0.0.1", preferred_port))
            return preferred_port
        except OSError:
            probe.bind(("127.0.0.1", 0))
            return probe.getsockname()[1]


if __name__ == "__main__":
    configure_qt_for_linux()

    QApplication.setAttribute(Qt.ApplicationAttribute.AA_ShareOpenGLContexts)

    backend_port = resolve_backend_port(8000)
    app = QApplication(sys.argv)

    window = MainWindow(backend_port)
    window.show()

    try:
        from qasync import QEventLoop
    except Exception:
        # Fallback path keeps compatibility when qasync is not installed.
        server_thread = threading.Thread(target=run_server, args=(backend_port,), daemon=True)
        server_thread.start()
        sys.exit(app.exec())

    loop = QEventLoop(app)
    asyncio.set_event_loop(loop)
    stop_event = asyncio.Event()
    app.aboutToQuit.connect(stop_event.set)

    with loop:
        loop.create_task(run_server_with_qasync(backend_port, stop_event))
        loop.run_forever()

    sys.exit(0)
