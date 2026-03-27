# Decky Plugin - Download All

This is a simple decky plugin to add the download all functionality.

Currently it doesn't support injecting the button anywhere in the UI, but you can access the plugin from the decky menu and easily initiate download all from there.

Supports 3 download modes:

1. Download All - Will start all downloads. This will include unscheduled downloads
2. Scheduled - Will start all scheduled downloads. Excludes unscheduled downloads.
3. Size Limit - Same as scheduled, but will only auto-start up to a given configurable max size limit.

The downloader always schedules downloads ordered by size, smallest to largest first.
