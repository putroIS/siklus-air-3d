# Siklus Air 3D — Simulasi Alam

Website simulasi siklus air 3D menggunakan HTML, CSS, JavaScript, dan Three.js.

## Fitur
- Lingkungan 3D: laut, sungai, pepohonan, bukit, gunung, awan, dan matahari.
- Partikel uap air dan hujan.
- Enam tahapan siklus air dengan penjelasan bahasa Indonesia.
- Kontrol Play/Pause, tahap sebelumnya/berikutnya, dan Reset.
- Audio lingkungan sintetis menggunakan Web Audio API.
- Tombol aktif/nonaktif suara dan pengaturan volume.
- Suasana audio berubah mengikuti tahapan simulasi.
- Tidak memerlukan file MP3 tambahan.

## Cara menjalankan
1. Unggah `index.html`, `style.css`, `script.js`, dan `README.md` ke root repository GitHub.
2. Aktifkan GitHub Pages melalui Settings → Pages.
3. Pilih Deploy from a branch, branch `main`, folder `/ (root)`.
4. Buka URL GitHub Pages setelah deployment selesai.

## Catatan audio
Browser biasanya memblokir audio otomatis. Pengunjung harus menekan tombol **Aktifkan suara** terlebih dahulu. Suara alam dibuat secara sintetis di browser, sehingga tidak memerlukan aset MP3 terpisah.

## Teknologi
- Three.js 0.160.0 melalui CDN
- HTML5
- CSS3
- JavaScript ES Modules
- Web Audio API


## Visual tahapan yang diperjelas
Setiap tahap sekarang memiliki visual khusus yang tampil bergantian:
1. Evaporasi: partikel uap naik dari permukaan laut.
2. Transpirasi: partikel uap naik dari kawasan pepohonan.
3. Kondensasi: awan diberi halo animasi sebagai penanda pembentukan awan.
4. Presipitasi: garis-garis hujan jatuh dari awan.
5. Infiltrasi & runoff: lapisan tanah, air bawah tanah, tetesan yang meresap, dan aliran permukaan terlihat.
6. Pengumpulan: riak air muncul di permukaan laut.
