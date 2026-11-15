import React, { useState } from 'react';
import { Sparkles, CheckCircle2, BookOpen, Sliders, Clock, Layers, GraduationCap } from 'lucide-react';
import { LearningFormConfig } from '../types/game';
import { SearchableSelect, SelectOptionGroup } from './SearchableSelect';

const SUBJECT_GROUPS: SelectOptionGroup[] = [
  {
    label: 'Mata Pelajaran Utama SD / MI',
    options: [
      { value: 'Pendidikan Pancasila', label: 'Pendidikan Pancasila' },
      { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
      { value: 'Matematika', label: 'Matematika' },
      { value: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', label: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)' },
      { value: 'Pendidikan Agama dan Budi Pekerti', label: 'Pendidikan Agama dan Budi Pekerti' },
      { value: 'PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)', label: 'PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)' },
    ],
  },
  {
    label: 'Seni, Bahasa & Muatan Lokal SD / MI',
    options: [
      { value: 'Seni dan Budaya (SBdP)', label: 'Seni dan Budaya (SBdP)' },
      { value: 'Bahasa Inggris SD', label: 'Bahasa Inggris SD' },
      { value: 'Bahasa Daerah / Muatan Lokal', label: 'Bahasa Daerah / Muatan Lokal' },
      { value: 'Informatika / TIK SD', label: 'Informatika / TIK SD' },
      { value: 'Proyek Penguatan Profil Pelajar Pancasila (P5)', label: 'Proyek Penguatan Profil Pelajar Pancasila (P5)' },
    ],
  },
];

const GRADE_GROUPS: SelectOptionGroup[] = [
  {
    label: 'Fase A — Kelas Rendah SD',
    options: [
      { value: '1 SD', label: 'Kelas 1 SD' },
      { value: '2 SD', label: 'Kelas 2 SD' },
    ],
  },
  {
    label: 'Fase B — Kelas Tengah SD',
    options: [
      { value: '3 SD', label: 'Kelas 3 SD' },
      { value: '4 SD', label: 'Kelas 4 SD' },
    ],
  },
  {
    label: 'Fase C — Kelas Tinggi SD',
    options: [
      { value: '5 SD', label: 'Kelas 5 SD' },
      { value: '6 SD', label: 'Kelas 6 SD' },
    ],
  },
];

interface LearningFormViewProps {
  config: LearningFormConfig;
  onChangeConfig: (newConfig: LearningFormConfig) => void;
  onGenerateAI: () => Promise<void>;
  onUseExistingQuestions: () => void;
  isGenerating: boolean;
  questionCountReady: number;
  statusMessage: string | null;
}

export const LearningFormView: React.FC<LearningFormViewProps> = ({
  config,
  onChangeConfig,
  onGenerateAI,
  onUseExistingQuestions,
  isGenerating,
  questionCountReady,
  statusMessage,
}) => {
  const [imgError, setImgError] = useState(false);

  const handleFieldChange = (
    field: keyof LearningFormConfig,
    value: string | number
  ) => {
    onChangeConfig({
      ...config,
      [field]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerateAI();
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* Left Column: Stage Hero & Visual Game Identity (5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl overflow-hidden border border-sky-400/20 bg-[#0D1B36] relative shadow-xl min-h-[540px]">
        {/* Key-Art Backdrop with Measured Scrim */}
        <div className="absolute inset-0">
          {!imgError ? (
            <img
              src="/src/assets/images/pancasila_classroom_arena_backdrop_1794703841496.jpg"
              alt="Arena Permainan Kelas Kamera Benar-Salah"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-45"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-900/60 via-[#0D1B36] to-indigo-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1428] via-[#0A1428]/75 to-[#0A1428]/35" />
        </div>

        {/* Top Stage Kicker & Bespoke Inline SVG Title Lockup */}
        <div className="relative z-10 p-7 flex flex-col gap-5">
          <div className="text-xs font-medium tracking-wider text-sky-300 flex items-center gap-2">
            <span>MEDIA PEMBELAJARAN INTERAKTIF PROYEKTOR KELAS</span>
            <span aria-hidden="true">·</span>
            <span>POSE DETECTION</span>
          </div>

          {/* Bespoke SVG Title Lockup */}
          <div className="py-2">
            <svg
              viewBox="0 0 460 115"
              className="w-full max-w-[400px] h-auto drop-shadow-md"
              role="img"
              aria-label="Kamera Benar Salah"
            >
              <defs>
                <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="50%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient id="leftZoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="rightZoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>
              {/* Camera Lens Motif */}
              <rect x="4" y="8" width="54" height="54" rx="14" fill="#0284C7" stroke="#7DD3FC" strokeWidth="2.5" />
              <circle cx="31" cy="35" r="14" fill="#0A1428" stroke="#F8FAFC" strokeWidth="2.5" />
              <circle cx="31" cy="35" r="5" fill="#38BDF8" />
              <text
                x="72"
                y="48"
                fill="url(#titleGrad)"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="40"
                letterSpacing="-0.5"
              >
                KAMERA
              </text>
              {/* BENAR - SALAH Dual Emblem */}
              <rect x="4" y="72" width="214" height="36" rx="8" fill="url(#leftZoneGrad)" />
              <text
                x="111"
                y="96"
                textAnchor="middle"
                fill="#FFFFFF"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="21"
                letterSpacing="1.5"
              >
                ◄ KIRI : BENAR
              </text>
              <rect x="230" y="72" width="214" height="36" rx="8" fill="url(#rightZoneGrad)" />
              <text
                x="337"
                y="96"
                textAnchor="middle"
                fill="#FFFFFF"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="21"
                letterSpacing="1.5"
              >
                KANAN : SALAH ►
              </text>
            </svg>
          </div>

          <p className="text-slate-200 text-base leading-relaxed max-w-md">
            Siswa menjawab pertanyaan langsung di depan kamera laptop dan proyektor kelas dengan menggeser tubuh ke{' '}
            <strong className="text-emerald-400 font-semibold">Kiri (BENAR)</strong> atau ke{' '}
            <strong className="text-rose-400 font-semibold">Kanan (SALAH)</strong>.
          </p>
        </div>

        {/* Bottom Instruction & Control Hint Strip */}
        <div className="relative z-10 p-7 pt-4 border-t border-slate-800/80 bg-[#091224]/90 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-xs text-sky-400 font-semibold">Langkah 1</div>
              <div className="text-sm font-medium text-white mt-0.5">Input & AI Soal</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-xs text-sky-400 font-semibold">Langkah 2</div>
              <div className="text-sm font-medium text-white mt-0.5">Review Guru</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-xs text-sky-400 font-semibold">Langkah 3</div>
              <div className="text-sm font-medium text-white mt-0.5">Kamera & Main</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono-tabular">
            Kontrol Kelas: Geser Tubuh Kiri/Kanan · Panah ◄/► · Klik Panel
          </div>
        </div>
      </div>

      {/* Right Column: Teacher Learning Configuration Form (7 cols) */}
      <div className="lg:col-span-7 rounded-2xl bg-[#0F1E3A] border border-slate-800 p-7 lg:p-8 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight text-balance">
                1. Formulir Input Pembelajaran
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Pilih mata pelajaran dan jenjang kelas melalui menu dropdown pencarian, lalu sesuaikan materi ajar.
              </p>
            </div>
            <div className="text-xs text-sky-300 font-mono-tabular">
              {questionCountReady} Soal Siap Digunakan
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Mata Pelajaran (Searchable Dropdown) */}
              <SearchableSelect
                id="input-subject"
                label="Mata Pelajaran"
                value={config.subject}
                onChange={(val) => handleFieldChange('subject', val)}
                groups={SUBJECT_GROUPS}
                placeholder="Pilih Mata Pelajaran..."
                searchPlaceholder="Cari mata pelajaran (mis. IPAS, Matematika)..."
                icon={<BookOpen className="w-4 h-4 text-sky-400" />}
              />

              {/* Materi */}
              <div>
                <label
                  htmlFor="input-topic"
                  className="block text-sm font-semibold text-slate-200 mb-2"
                >
                  Materi Pembelajaran
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-topic"
                    type="text"
                    required
                    value={config.topic}
                    onChange={(e) => handleFieldChange('topic', e.target.value)}
                    placeholder="Contoh: Aturan, Hak, dan Kewajiban"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-base focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Kelas SD (Searchable Dropdown) */}
              <SearchableSelect
                id="input-grade"
                label="Kelas (Jenjang SD)"
                value={config.grade}
                onChange={(val) => handleFieldChange('grade', val)}
                groups={GRADE_GROUPS}
                placeholder="Pilih Kelas SD..."
                searchPlaceholder="Cari kelas (1 SD - 6 SD)..."
                icon={<GraduationCap className="w-4 h-4 text-sky-400" />}
              />

              {/* Jumlah Soal */}
              <div>
                <label
                  htmlFor="input-count"
                  className="block text-sm font-semibold text-slate-200 mb-2"
                >
                  Jumlah Soal
                </label>
                <input
                  id="input-count"
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={config.questionCount}
                  onChange={(e) =>
                    handleFieldChange('questionCount', Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-base font-mono-tabular focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Timer per Soal */}
              <div>
                <label
                  htmlFor="input-timer"
                  className="block text-sm font-semibold text-slate-200 mb-2"
                >
                  Waktu per Soal (Detik)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-timer"
                    type="number"
                    min={5}
                    max={60}
                    required
                    value={config.timerSeconds}
                    onChange={(e) =>
                      handleFieldChange('timerSeconds', Math.max(5, Math.min(60, Number(e.target.value) || 15)))
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-base font-mono-tabular focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Tingkat Kesulitan */}
            <div>
              <label
                htmlFor="input-difficulty"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Tingkat Kesulitan
              </label>
              <div className="relative">
                <Sliders className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-difficulty"
                  type="text"
                  required
                  value={config.difficulty}
                  onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                  placeholder="Campuran (mudah, sedang, sulit)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-base focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  'Campuran (mudah, sedang, sulit)',
                  'Mudah',
                  'Sedang',
                  'Sulit',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleFieldChange('difficulty', preset)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      config.difficulty === preset
                        ? 'bg-sky-500 text-white'
                        : 'bg-[#091326] text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Tujuan Pembelajaran */}
            <div>
              <label
                htmlFor="input-objective"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Tujuan Pembelajaran
              </label>
              <textarea
                id="input-objective"
                rows={3}
                required
                value={config.learningObjective}
                onChange={(e) => handleFieldChange('learningObjective', e.target.value)}
                placeholder="Masukkan tujuan pembelajaran..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-base focus:outline-none focus:border-sky-400 transition-colors resize-none"
              />
            </div>

            {statusMessage && (
              <div className="p-3.5 rounded-xl bg-sky-950/70 border border-sky-500/40 text-sky-200 text-sm">
                {statusMessage}
              </div>
            )}

            {/* Primary & Secondary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 min-w-[240px] py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {isGenerating
                    ? 'Sedang Membuat Soal dengan Gemini AI...'
                    : `Generate Soal AI (${config.questionCount} Soal)`}
                </span>
              </button>

              <button
                type="button"
                onClick={onUseExistingQuestions}
                disabled={isGenerating}
                className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-base flex items-center justify-center gap-2 border border-slate-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Pratinjau & Edit Soal ({questionCountReady})</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
