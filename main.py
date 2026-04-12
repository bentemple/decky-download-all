import decky

decky.logger.info("main.py loaded")


class Plugin:
    async def log_from_ui(self, level: str, message: str) -> dict:
        """Log a message from the UI to the Decky log file."""
        log_func = getattr(decky.logger, level.lower(), decky.logger.info)
        log_func(f"[UI] {message}")
        return {"success": True}

    async def _main(self):
        decky.logger.info("Download All plugin loaded")

    async def _unload(self):
        decky.logger.info("Download All plugin unloaded")
