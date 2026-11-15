import React from 'react';
import { X, Terminal, Camera, HelpCircle } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F1E3A] border border-slate-700 p-6 lg:p-7 shadow-2xl max-h-[88vh] overflow-y-auto flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-sky-400" />
            <h2 id="guide-modal-title" className="text-xl font-bold text-white">
              Panduan Penggunaan & Instalasi Kelas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
          <div className="p-4 rounded-xl bg-[#091326] border border-slate-800 space-y-2">
            <h3 className="font-bold text-sky-300 flex items-center gap-2 text-base">
              <Camera className="w-4 h-4" />
              <span>1. Cara Bermain & Mengaktifkan Kamera Webcam</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                Pastikan browser (Chrome / Edge / Firefox) diizinkan mengakses kamera ketika muncul pop-up izin{' '}
                <strong>Allow Camera</strong>.
              </li>
              <li>
                Berdirilah sekitar 1,5 – 2,5 meter di depan kamera laptop agar tubuh bagian atas terlihat jelas pada layar proyektor.
              </li>
              <li>
                <strong>Geser tubuh ke KIRI</strong> untuk memilih jawaban <strong className="text-emerald-400">BENAR</strong>.
              </li>
              <li>
                <strong>Geser tubuh ke KANAN</strong> untuk memilih jawaban <strong className="text-rose-400">SALAH</strong>.
              </li>
              <li>
                Tahan posisi selama kurang lebih 0,6 detik hingga indikator terisi penuh, atau gunakan tombol panah keyboard{' '}
                <code>◄</code> / <code>►</code> sebagai kendali bantu guru.
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-slate-800 space-y-2">
            <h3 className="font-bold text-sky-300 flex items-center gap-2 text-base">
              <Terminal className="w-4 h-4" />
              <span>2. Petunjuk Instalasi & Menjalankan di Localhost</span>
            </h3>
            <p className="text-slate-300">
              Untuk menjalankan proyek ini secara mandiri di komputer/laptop lokal:
            </p>
            <pre className="p-3 rounded-lg bg-slate-950 text-sky-300 font-mono text-xs overflow-x-auto">
{`# 1. Instal seluruh dependensi proyek
npm install

# 2. Salin file konfigurasi environment (.env.example ke .env)
cp .env.example .env

# 3. Jalankan server pengembangan (Express + Vite di port 3000)
npm run dev

# 4. Buka browser di:
http://localhost:3000`}
            </pre>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Mengerti & Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
