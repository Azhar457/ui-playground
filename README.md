# UI Playground — Beta

Laboratorium UI/UX berisi **61 gaya desain** (style praktis + prompt rekayasa kode),
studi kasus 3D (Kimi Fabric), dan koleksi komponen interaktif yang bisa di-copypaste.

## Struktur

```
.
├── index.html                 # Simulator: pilih style → lihat demo + copy prompt
├── showcase.html              # Premium showcase: 61 styles + theme switcher
├── atelier-fusion-system.html # Fusion engine: gabungkan 2 style jadi hybrid
├── previews/                  # 58 file demo per-style (1.html … 61.html)
├── case-studies/              # 3D case studies (Three.js / Canvas / React)
│   ├── index.html             # Hub studi kasus
│   ├── cyberpunk-megapolis.html
│   ├── silk-atlas.html
│   ├── leo-live.html
│   ├── threat-globe.html
│   ├── mempul-crypto-reel.html
│   └── vault-command-center.html
├── component/                 # 18 widget interaktif mandiri (carousel, marquee, physics, …)
│   └── index.html             # Hub komponen
└── tools/
    └── linkcheck.mjs          # Cek deadlink internal (Node)
```

## Deploy (Netlify — static, tanpa build)

Site ini murni static (HTML/CSS/JS, semua lib via CDN). Tidak ada step build.

- **Netlify Drop:** zip folder ini → drop ke https://app.netlify.com/drop
- **Netlify Git:** connect repo ini → branch `main` → Build command kosong, Publish directory `.`

Buka `index.html` sebagai beranda. Tidak perlu server khusus.

## Konten

- **61 Styles** — terdaftar di `index.html` (sidebar simulator) & `showcase.html` (katalog).
  ID tertinggi = 61; slot 43/48/50 sengaja dihapus (tidak memenuhi standar).
- **Case Studies** — 6 project Kimi Fabric (3D engine, geo-precision, real-time viz, threat globe, crypto reel, vault command center).
- **Components** — 18 motion widget reusable, masing-masing self-contained.

## Perawatan

Jalankan pengecekan deadlink sebelum commit:

```bash
node tools/linkcheck.mjs
```

Script memindai semua `*.html`, resolve link lokal (`href`/`src`), dan melaporkan
setiap target yang tidak dtemukan. Exit code `1` bila ada broken link.
