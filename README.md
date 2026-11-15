# KAMERA BENAR-SALAH — Aplikasi Web Game Edukasi Interaktif Kelas

**KAMERA BENAR-SALAH** adalah aplikasi web game edukasi interaktif berbasis **React, TypeScript, Tailwind CSS, MediaPipe Pose, MediaDevices API, dan Backend Express + Gemini API**. Aplikasi ini dirancang untuk ditampilkan melalui proyektor kelas, di mana siswa menjawab soal **Benar-Salah** menggunakan gerakan tubuh ke **Kiri (BENAR)** dan ke **Kanan (SALAH)** di depan kamera laptop.

---

## Fitur Utama

1. **Formulir Input Pembelajaran (Bisa Diedit Guru)**
   - **Mata Pelajaran Default**: Pendidikan Pancasila
   - **Materi Default**: Aturan, Hak, dan Kewajjiban
   - **Kelas Default**: 3 SD
   - **Tujuan Pembelajaran**: Memahami ATURAN, HAK, DAN KEWAJIBAN di RUMAH, SEKOLAH, dan Masyarakat
   - **Jumlah Soal**: 30 soal
   - **Tingkat Kesulitan**: Campuran (mudah, sedang, sulit)

2. **Generator Soal AI (Backend Express + `@google/genai`) & Paket Soal Contoh**
   - Menggunakan Gemini API melalui endpoint backend `/api/generate-questions` agar API Key tersimpan secara aman di server.
   - Dilengkapi **30 soal kurikulum Pendidikan Pancasila Kelas 3 SD** bawaan apabila API Key belum dikonfigurasi.
   - **Halaman Pratinjau & Pemeriksaan Guru**: Guru dapat mengedit pernyataan, mengubah kunci jawaban (Benar/Salah), mengedit pembahasan, menambah soal baru, dan menghapus soal sebelum permainan dimulai.

3. **Satu Komponen Kamera Utama (`CameraArenaView.tsx`)**
   - Digunakan secara konsisten pada **Halaman Uji Coba Gerakan (`MODE UJI COBA`)** dan **Halaman Permainan Berlangsung (`MODE PERMAINAN`)**.
   - Menggunakan **satu `MediaStream`** dan **satu elemen `<video>`** yang tetap hidup tanpa di-unmount atau dibuat ulang ketika berpindah dari uji coba ke permainan maupun saat berganti soal.
   - **Aturan Gerakan**:
     - **Geser ke Kiri = BENAR**
     - **Geser ke Kanan = SALAH**

4. **Halaman Hasil Akhir & Pembahasan Lengkap**
   - Menampilkan Total Soal, Jawaban Benar, Jawaban Salah, Tidak Terjawab, Total Skor, dan Persentase Nilai.
   - Dilengkapi rincian pembahasan setiap soal, jawaban siswa, kunci jawaban, serta tombol **Main Lagi**, **Lihat Pembahasan**, dan **Kembali ke Beranda**.

---

## Struktur Folder Proyek

```text
/
├── .env.example                  # Contoh konfigurasi environment variabel server
├── index.html                    # Entry HTML aplikasi
├── metadata.json                 # Konfigurasi izin kamera & kapabilitas aplikasi
├── package.json                  # Dependensi dan skrip npm
├── server.ts                     # Server backend Express + Gemini API + Vite middleware
├── tsconfig.json                 # Konfigurasi TypeScript
├── vite.config.ts                # Konfigurasi bundler Vite
└── src/
    ├── App.tsx                   # State utama alur aplikasi (Form -> Pratinjau -> Kamera -> Hasil)
    ├── index.css                 # Konfigurasi Tailwind CSS & tipografi proyektor
    ├── main.tsx                  # Entry point React DOM
    ├── components/
    │   ├── LearningFormView.tsx  # Halaman 1: Form Input Pembelajaran
    │   ├── QuestionPreviewView.tsx # Halaman 2: Pratinjau & Edit Soal oleh Guru
    │   ├── CameraArenaView.tsx   # Halaman 3: Komponen Kamera Tunggal (Uji Gerakan & Permainan)
    │   ├── FinalResultsView.tsx  # Halaman 4: Hasil Akhir & Pembahasan
    │   └── GuideModal.tsx        # Modal panduan instalasi & penggunaan kamera
    ├── data/
    │   └── defaultQuestions.ts   # 30 Soal bawaan Pendidikan Pancasila Kelas 3 SD
    ├── types/
    │   └── game.ts               # Definisi tipe data TypeScript
    └── utils/
        └── sound.ts              # Efek suara prosedural Web Audio API
```

---

## Petunjuk Instalasi & Menjalankan di Localhost

1. **Pastikan Node.js (versi 18+) telah terpasang** di laptop Anda.
2. **Instal dependensi proyek**:
   ```bash
   npm install
   ```
3. **Konfigurasi Gemini API Key (Opsional namun direkomendasikan)**:
   - Salin file `.env.example` menjadi `.env`:
     ```bash
     cp .env.example .env
     ```
   - Buka file `.env` dan isi `GEMINI_API_KEY` dengan API Key Google Gemini Anda:
     ```env
     GEMINI_API_KEY="MASUKKAN_API_KEY_GEMINI_ANDA_DI_SINI"
     ```
   - *Catatan*: Jika `GEMINI_API_KEY` belum diisi, aplikasi tetap berjalan lancar menggunakan 30 soal contoh Pendidikan Pancasila Kelas 3 SD.
4. **Jalankan aplikasi di localhost**:
   ```bash
   npm run dev
   ```
5. **Buka aplikasi di browser**:
   Akses `http://localhost:3000` menggunakan Google Chrome atau Microsoft Edge.

---

## Petunjuk Mengaktifkan Webcam di Browser

1. Saat masuk ke **Arena Kamera**, browser akan menampilkan permintaan izin penggunaan kamera (**Allow Camera**). Klik **Allow / Izinkan**.
2. Pastikan webcam tidak sedang dikunci oleh aplikasi konferensi video lain (seperti Zoom/Meet).
3. Siswa berdiri sekitar **1,5 hingga 2,5 meter** di depan kamera laptop agar wajah dan bahu terlihat di area tengah video LIVE.
4. Geser tubuh ke **KIRI** untuk menjawab **BENAR**, atau geser tubuh ke **KANAN** untuk menjawab **SALAH**.
