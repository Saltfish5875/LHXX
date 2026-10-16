"""把书法字体裁成游戏里实际用到的字，输出到 src/art/fonts/。

文字内容改动后重跑一次：
  python3 -m pip install fonttools brotli
  python3 scripts/subset-fonts.py <MaShanZheng-Regular.ttf> <LXGWWenKai-Regular.ttf>

字体来源（均为 SIL OFL 1.1）：
  马善政毛笔楷书 https://github.com/google/fonts/tree/main/ofl/mashanzheng
  霞鹜文楷       https://github.com/lxgw/LxgwWenKai/releases
"""
import pathlib
import sys

from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
files = [*root.glob('src/**/*.ts'), root / 'index.html']
text = ''.join(p.read_text(encoding='utf-8') for p in files)
# 常用标点、数字与少量备用字，免得新文案出现豆腐块
extra = '０１２３４５６７８９，。、；：？！…—～·「」『』《》（）【】“”‘’零一二三四五六七八九十百千万亿年岁世卷页灯劫缘凶平引故'
chars = sorted({c for c in text + extra if ord(c) > 0x2E7F})
ascii_ = ''.join(chr(i) for i in range(0x20, 0x7F))
unicodes = [ord(c) for c in chars + list(ascii_)]
print(f'{len(chars)} 个汉字/全角符号')

out = root / 'src' / 'art' / 'fonts'
out.mkdir(parents=True, exist_ok=True)
for src, name in zip(sys.argv[1:3], ['brush', 'wenkai']):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    dest = out / f'{name}.woff2'
    subset.save_font(font, str(dest), opts)
    print(dest.name, dest.stat().st_size // 1024, 'KB')
