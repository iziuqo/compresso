"""Print what takes space in the Android build. Runs on EAS after a build."""
import collections, glob, os, sys, zipfile

files = glob.glob('android/app/build/outputs/**/*.apk', recursive=True) + \
        glob.glob('android/app/build/outputs/**/*.aab', recursive=True)
for path in files:
    z = zipfile.ZipFile(path)
    groups = collections.Counter()
    for i in z.infolist():
        parts = i.filename.split('/')
        key = '/'.join(parts[:2]) if parts[0] in ('lib', 'base', 'assets') else parts[0]
        if parts[0] == 'base' and len(parts) > 2 and parts[1] == 'lib':
            key = '/'.join(parts[:3])
        groups[key] += i.compress_size
    print(f'\n== {os.path.basename(path)}: {os.path.getsize(path) / 1e6:.1f} MB')
    for key, size in groups.most_common(12):
        print(f'{size / 1e6:8.2f} MB  {key}')
    print('-- largest files')
    for i in sorted(z.infolist(), key=lambda i: -i.compress_size)[:15]:
        print(f'{i.compress_size / 1e6:8.2f} MB  {i.filename}')
sys.exit(0)
