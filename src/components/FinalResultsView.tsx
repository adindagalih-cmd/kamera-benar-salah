import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  BookOpen,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LearningFormConfig, StudentAnswerRecord } from '../types/game';

interface FinalResultsViewProps {
  config: LearningFormConfig;
  records: StudentAnswerRecord[];
  totalQuestionCount: number;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

export const FinalResultsView: React.FC<FinalResultsViewProps> = ({
  config,
  records,
  totalQuestionCount,
  onPlayAgain,
  onBackToHome,
}) => {
  const discussionRef = useRef<HTMLDivElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'
  >('ALL');

  const totalQuestions = Math.max(totalQuestionCount, records.length);
  const correctCount = records.filter((r) => r.isCorrect).length;
  const unansweredCount =
    records.filter((r) => r.studentAnswer === null).length +
    Math.max(0, totalQuestions - records.length);
  const wrongCount = records.filter(
    (r) => r.studentAnswer !== null && !r.isCorrect
  ).length;

  const totalScore = correctCount * 100;
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Trigger celebratory confetti animation when completing the game with a high score (>= 70%)
  useEffect(() => {
    if (percentage < 70) return;

    const colors = ['#38BDF8', '#10B981', '#FBBF24', '#F43F5E', '#FFFFFF'];
    const duration = 2400;
    const end = Date.now() + duration;
    let rafId: number | null = null;

    // Initial center burst
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.6 },
      colors,
    });

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
      });

      if (Date.now() < end) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [percentage]);

  const handleScrollToDiscussion = () => {
    discussionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownloadCSV = () => {
    const escapeCSV = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const summaryRows = [
      ['LAPORAN HASIL AKHIR - KAMERA BENAR-SALAH'],
      ['Mata Pelajaran', config.subject],
      ['Materi', config.topic],
      ['Kelas', config.grade],
      ['Tujuan Pembelajaran', config.learningObjective],
      ['Total Soal', totalQuestions],
      ['Jawaban Benar', correctCount],
      ['Jawaban Salah', wrongCount],
      ['Tidak Terjawab', unansweredCount],
      ['Total Skor', totalScore],
      ['Persentase Nilai', `${percentage}%`],
      [],
      [
        'No Soal',
        'Pernyataan / Pertanyaan',
        'Tingkat Kesulitan',
        'Jawaban Siswa',
        'Kunci Jawaban',
        'Status Jawaban',
        'Skor Soal',
        'Waktu Jawab (Detik)',
        'Pembahasan',
      ],
    ];

    const detailRows = records.map((rec, index) => {
      const studentAnsText =
        rec.studentAnswer === null
          ? 'Tidak Terjawab'
          : rec.studentAnswer
          ? 'BENAR (Kiri)'
          : 'SALAH (Kanan)';
      const keyAnsText = rec.correctAnswer ? 'BENAR (Kiri)' : 'SALAH (Kanan)';
      const statusText =
        rec.studentAnswer === null
          ? 'Tidak Terjawab'
          : rec.isCorrect
          ? 'Benar'
          : 'Salah';
      const itemScore = rec.isCorrect ? 100 : 0;

      return [
        index + 1,
        rec.statement,
        rec.difficulty,
        studentAnsText,
        keyAnsText,
        statusText,
        itemScore,
        rec.timeSpentSeconds,
        rec.explanation,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [...summaryRows, ...detailRows]
        .map((row) => row.map(escapeCSV).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTopic = config.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.href = url;
    link.setAttribute(
      'download',
      `hasil-kamera-benar-salah-${safeTopic || 'kelas'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter((r) => {
    if (filterStatus === 'CORRECT') return r.isCorrect;
    if (filterStatus === 'WRONG') return r.studentAnswer !== null && !r.isCorrect;
    if (filterStatus === 'UNANSWERED') return r.studentAnswer === null;
    return true;
  });

  return (
    <div className="w-full max-w-[1360px] mx-auto px-6 py-6 flex flex-col gap-6">
      {/* Main Score & Summary Banner */}
      <div className="rounded-2xl bg-[#0F1E3A] border border-slate-800 p-7 lg:p-8 shadow-xl flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-300">
              <span>HASIL AKHIR PERMAINAN KELAS</span>
              <span aria-hidden="true">·</span>
              <span>{config.subject}</span>
              <span aria-hidden="true">·</span>
              <span>{config.topic}</span>
              <span aria-hidden="true">·</span>
              <span>Kelas {config.grade}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Permainan Selesai! Nilai Akhir: {percentage}%
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Tujuan Pembelajaran: {config.learningObjective}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onPlayAgain}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Main Lagi</span>
            </button>

            <button
              type="button"
              onClick={handleScrollToDiscussion}
              className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4" />
              <span>Lihat Pembahasan</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Unduh CSV</span>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        </div>

        {/* 6 Mandatory Final Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono-tabular">
          <div className="p-4 rounded-xl bg-[#091326] border border-slate-800">
            <div className="text-xs text-slate-400 font-sans">Total Soal</div>
            <div className="text-2xl lg:text-3xl font-bold text-white mt-1">
              {totalQuestions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-emerald-500/30">
            <div className="text-xs text-emerald-300 font-sans">Jawaban Benar</div>
            <div className="text-2xl lg:text-3xl font-bold text-emerald-400 mt-1">
              {correctCount}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-rose-500/30">
            <div className="text-xs text-rose-300 font-sans">Jawaban Salah</div>
            <div className="text-2xl lg:text-3xl font-bold text-rose-400 mt-1">
              {wrongCount}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-amber-500/30">
            <div className="text-xs text-amber-300 font-sans">Tidak Terjawab</div>
            <div className="text-2xl lg:text-3xl font-bold text-amber-400 mt-1">
              {unansweredCount}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-sky-500/30">
            <div className="text-xs text-sky-300 font-sans">Total Skor</div>
            <div className="text-2xl lg:text-3xl font-bold text-sky-400 mt-1">
              {totalScore}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#091326] border border-indigo-500/30">
            <div className="text-xs text-indigo-300 font-sans">Persentase Nilai</div>
            <div className="text-2xl lg:text-3xl font-bold text-white mt-1">
              {percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Question-by-Question Review & Explanation Section */}
      <div
        ref={discussionRef}
        className="rounded-2xl bg-[#0F1E3A] border border-slate-800 p-6 lg:p-7 flex flex-col gap-5 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
              <Award className="w-6 h-6 text-sky-400" />
              <span>Pembahasan Lengkap Setiap Soal</span>
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Menampilkan pernyataan soal, jawaban siswa, kunci jawaban, status, serta pembahasan materi.
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-[#091326] border border-slate-800 rounded-xl">
            {(
              [
                { id: 'ALL', label: `Semua (${records.length})` },
                { id: 'CORRECT', label: `Benar (${correctCount})` },
                { id: 'WRONG', label: `Salah (${wrongCount})` },
                { id: 'UNANSWERED', label: `Tidak Terjawab (${unansweredCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterStatus === tab.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredRecords.map((rec, idx) => {
            const originalNumber =
              records.findIndex((r) => r.questionId === rec.questionId) + 1 ||
              idx + 1;

            return (
              <div
                key={`${rec.questionId}-${idx}`}
                className="rounded-xl bg-[#091326] border border-slate-800 p-5 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5 text-xs font-mono-tabular">
                    <span className="font-bold text-sky-400 text-sm">
                      Soal #{originalNumber}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-300">
                      Kesulitan: {rec.difficulty}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">
                      Waktu: {rec.timeSpentSeconds}d
                    </span>
                  </div>

                  {/* Status Benar / Salah / Tidak Terjawab */}
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {rec.studentAnswer === null ? (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>STATUS: TIDAK TERJAWAB</span>
                      </span>
                    ) : rec.isCorrect ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>STATUS: JAWABAN BENAR (+100)</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>STATUS: JAWABAN SALAH</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-base lg:text-lg font-bold text-white leading-snug">
                  “{rec.statement}”
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs lg:text-sm font-mono-tabular pt-1">
                  <div>
                    <span className="text-slate-400">Jawaban Siswa: </span>
                    <strong
                      className={
                        rec.studentAnswer === null
                          ? 'text-amber-300'
                          : rec.isCorrect
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {rec.studentAnswer === null
                        ? 'Tidak Dijawab (Waktu Habis)'
                        : rec.studentAnswer
                        ? 'BENAR (Geser Kiri)'
                        : 'SALAH (Geser Kanan)'}
                    </strong>
                  </div>

                  <span aria-hidden="true" className="text-slate-700">·</span>

                  <div>
                    <span className="text-slate-400">Kunci Jawaban: </span>
                    <strong
                      className={
                        rec.correctAnswer ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {rec.correctAnswer
                        ? 'BENAR (Geser Kiri)'
                        : 'SALAH (Geser Kanan)'}
                    </strong>
                  </div>
                </div>

                <div className="mt-1 pt-2.5 border-t border-slate-800/80 text-sm text-slate-200 leading-relaxed">
                  <strong className="text-sky-300 font-semibold">
                    Pembahasan:{' '}
                  </strong>
                  {rec.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
