# アイコン生成について

PWAアイコンは以下のサイズが必要です:
- 192x192px (icon-192x192.png)
- 512x512px (icon-512x512.png)

## 生成方法

```bash
# ImageMagickを使う場合
convert -size 192x192 xc:#3b82f6 \
  -fill white -pointsize 80 -gravity center \
  -annotate 0 "¥" \
  public/icons/icon-192x192.png

convert -size 512x512 xc:#3b82f6 \
  -fill white -pointsize 200 -gravity center \
  -annotate 0 "¥" \
  public/icons/icon-512x512.png
```

## 開発時の代替

開発段階では `/icons/icon-192x192.png` が存在しなくてもアプリは動作します。
本番化する前に適切なアイコンを用意してください。
