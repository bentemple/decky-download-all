# Decky Plugin - Download All

This is a simple decky plugin to add the download all functionality for starting all updates / downloads at once.

Currently it doesn't support injecting the button anywhere in the UI, but you can access the plugin from the decky menu and easily queue all downloads from there.

Supports 3 download modes:
1. All - Start all downloads, his will include unscheduled downloads.
2. Scheduled - Start all scheduled downloads, this excludes unscheduled downloads.
3. Scheduled with Size Limit - Same as scheduled, but will only start downloads up to a given configurable max size limit.

The downloader always schedules downloads below the existing active queue, ordered by size, smallest to largest first.

# Screenshots

<img width="1280" height="800" alt="image" src="https://github.com/user-attachments/assets/c9845478-40db-44c5-9c92-a3784e9cb555" />
