"""cine 工具共用：找无头浏览器（Metal 出图）。
CINE_CHROME 环境变量优先；否则用 Playwright 缓存里最新的 chromium_headless_shell；都没有就交给 Playwright 默认。"""
import os
from pathlib import Path

GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]


def chrome():
    if os.environ.get("CINE_CHROME"):
        return os.environ["CINE_CHROME"]
    found = sorted(Path.home().glob("Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell"),
                   key=lambda p: int(p.parts[-3].rsplit("-", 1)[-1]))
    return str(found[-1]) if found else None


def launch(p):
    exe = chrome()
    return p.chromium.launch(executable_path=exe, args=GPU) if exe else p.chromium.launch(args=GPU)
