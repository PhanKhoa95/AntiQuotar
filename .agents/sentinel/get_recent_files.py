import os

workspace = r"c:\Users\KHOA MEDIA\Documents\AntiQuotar"
exclude_dirs = {".git", ".agents", "node_modules", "dist"}

files = []
for root, dirs, filenames in os.walk(workspace):
    # filter directories in place to avoid walking into excluded ones
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for filename in filenames:
        filepath = os.path.join(root, filename)
        try:
            mtime = os.path.getmtime(filepath)
            files.append((mtime, filepath))
        except OSError:
            pass

files.sort(key=lambda x: x[0], reverse=True)
for mtime, filepath in files[:5]:
    print(filepath)
