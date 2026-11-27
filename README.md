# Earth 3D — Orbital

Visualisasi planet Bumi 3D interaktif menggunakan HTML, CSS, JavaScript, dan Three.js.

## Fitur
- Bumi 3D dengan tekstur permukaan, awan, dan atmosfer.
- Rotasi otomatis dan pengaturan kecepatan.
- Kamera dapat diputar dengan drag dan diperbesar dengan scroll.
- Tombol zoom, pause/play, dan reset.
- Tampilan responsif.

## Menjalankan secara lokal
Karena `script.js` menggunakan JavaScript module, jalankan melalui server lokal (bukan membuka HTML langsung).
Di VS Code, pasang ekstensi **Live Server**, lalu klik kanan `index.html` → **Open with Live Server**.

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub.
2. Upload `index.html`, `style.css`, `script.js`, dan `README.md` ke root repository.
3. Buka **Settings → Pages**.
4. Pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu klik **Save**.
5. Tunggu beberapa menit sampai URL GitHub Pages muncul.

## Catatan
Three.js dan tekstur Bumi dimuat dari CDN/situs eksternal. Koneksi internet diperlukan agar visualisasi dan tekstur tampil.
