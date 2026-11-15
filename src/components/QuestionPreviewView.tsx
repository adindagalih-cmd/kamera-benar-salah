import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Camera,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { DifficultyLevel, LearningFormConfig, QuestionItem } from '../types/game';

interface QuestionPreviewViewProps {
  config: LearningFormConfig;
  questions: QuestionItem[];
  onUpdateQuestions: (updated: QuestionItem[]) => void;
  onResetDefaultQuestions: () => void;
  onRegenerateAI: () => Promise<void>;
  isGenerating: boolean;
  onBackToForm: () => void;
  onProceedToCamera: () => void;
  statusMessage: string | null;
}

export const QuestionPreviewView: React.FC<QuestionPreviewViewProps> = ({
  config,
  questions,
  onUpdateQuestions,
  onResetDefaultQuestions,
  onRegenerateAI,
  isGenerating,
  onBackToForm,
  onProceedToCamera,
  statusMessage,
}) => {
  const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | DifficultyLevel>('ALL');
  const [newStatement, setNewStatement] = useState('');
  const [newAnswer, setNewAnswer] = useState<boolean>(true);
  const [newExplanation, setNewExplanation] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Sedang');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUpdateItem = (
    id: string,
    patch: Partial<QuestionItem>
  ) => {
    onUpdateQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (questions.length <= 1) return;
    onUpdateQuestions(questions.filter((q) => q.id !== id));
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim()) return;
    const newItem: QuestionItem = {
      id: `q-custom-${Date.now()}`,
      statement: newStatement.trim(),
      answer: newAnswer,
      explanation:
        newExplanation.trim() ||
        `Jawaban yang tepat adalah ${newAnswer ? 'BENAR' : 'SALAH'}.`,
      difficulty: newDifficulty,
    };
    onUpdateQuestions([newItem, ...questions]);
    setNewStatement('');
    setNewExplanation('');
    setNewAnswer(true);
    setShowAddForm(false);
  };

  const filteredQuestions =
    filterDifficulty === 'ALL'
      ? questions
      : questions.filter((q) => q.difficulty === filterDifficulty);

  const trueCount = questions.filter((q) => q.answer).length;
  const falseCount = questions.length - trueCount;

  return (
    <div className="w-full max-w-[1360px] mx-auto px-6 py-6 flex flex-col gap-6">
      {/* Top Action & Summary Header */}
      <div className="rounded-2xl bg-[#0F1E3A] border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-sky-300">
            <span>{config.subject}</span>
            <span aria-hidden="true">·</span>
            <span>{config.topic}</span>
            <span aria-hidden="true">·</span>
            <span>Kelas {config.grade}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            2. Pratinjau & Pemeriksaan Soal Guru
          </h1>
          <p className="text-sm text-slate-300">
            Periksa, edit pernyataan, ubah kunci jawaban Benar/Salah, atau tambahkan soal sebelum masuk ke halaman kamera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onBackToForm}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Form</span>
          </button>

          <button
            type="button"
            onClick={onRegenerateAI}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGenerating ? 'Membuat Ulang...' : 'Generate Ulang AI'}</span>
          </button>

          <button
            type="button"
            onClick={onProceedToCamera}
            disabled={questions.length === 0}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-base flex items-center gap-2.5 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="w-5 h-5" />
            <span>Selesai Periksa & Buka Kamera ({questions.length} Soal)</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-sky-950/80 border border-sky-500/40 text-sky-200 text-sm flex items-center justify-between gap-4">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={onResetDefaultQuestions}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Muat 30 Soal Bawaan</span>
          </button>
        </div>
      )}

      {/* Filter Bar & Add Question Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-[#091326] border border-slate-800 rounded-xl">
            {(['ALL', 'Mudah', 'Sedang', 'Sulit'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilterDifficulty(level)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterDifficulty === level
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {level === 'ALL' ? `Semua (${questions.length})` : level}
              </button>
            ))}
          </div>

          {/* Unboxed Metadata Summary */}
          <div className="text-xs text-slate-400 font-mono-tabular flex items-center gap-2">
            <span>Total: {questions.length} Soal</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Kunci BENAR: {trueCount}</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-400">Kunci SALAH: {falseCount}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Tutup Form Tambah Soal' : 'Tambah Soal Baru'}</span>
        </button>
      </div>

      {/* Collapsible Add Question Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddQuestion}
          className="rounded-2xl bg-[#0D1A33] border border-sky-500/40 p-6 space-y-4 shadow-lg"
        >
          <h2 className="text-lg font-bold text-white">Tambah Soal Benar-Salah Baru</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pernyataan atau Pertanyaan
              </label>
              <textarea
                rows={2}
                required
                value={newStatement}
                onChange={(e) => setNewStatement(e.target.value)}
                placeholder="Tulis pernyataan soal Benar-Salah di sini..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="lg:col-span-6">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pembahasan Singkat
              </label>
              <textarea
                rows={2}
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="Tulis alasan mengapa pernyataan ini Benar atau Salah..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#091326] border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-6">
              {/* Kunci Jawaban Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Kunci Jawaban:</span>
                <button
                  type="button"
                  onClick={() => setNewAnswer(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    newAnswer
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>BENAR (Kiri)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewAnswer(false)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    !newAnswer
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>SALAH (Kanan)</span>
                </button>
              </div>

              {/* Difficulty Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Kesulitan:</span>
                {(['Mudah', 'Sedang', 'Sulit'] as DifficultyLevel[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                      newDifficulty === d
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              Simpan Soal ke Daftar
            </button>
          </div>
        </form>
      )}

      {/* Editable Question Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQuestions.map((q) => {
          const originalIndex = questions.findIndex((item) => item.id === q.id);
          return (
            <div
              key={q.id}
              className="rounded-2xl bg-[#0F1E3A] border border-slate-800 p-5 flex flex-col gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-sm font-bold text-sky-400">
                    Soal #{originalIndex + 1}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  {/* Interactive difficulty selector per question */}
                  <div className="flex items-center gap-1 bg-[#091326] p-1 rounded-lg border border-slate-800">
                    {(['Mudah', 'Sedang', 'Sulit'] as DifficultyLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleUpdateItem(q.id, { difficulty: lvl })}
                        className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          q.difficulty === lvl
                            ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Kunci Jawaban Interactive Toggle */}
                  <div className="flex items-center gap-1.5 bg-[#091326] p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(q.id, { answer: true })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        q.answer
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>BENAR (Geser Kiri)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(q.id, { answer: false })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        !q.answer
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>SALAH (Geser Kanan)</span>
                    </button>
                  </div>

                  {/* Delete Question Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(q.id)}
                    disabled={questions.length <= 1}
                    title="Hapus soal ini"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Statement and Explanation */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Pernyataan / Pertanyaan Soal (Klik untuk mengedit)
                  </label>
                  <textarea
                    rows={2}
                    value={q.statement}
                    onChange={(e) =>
                      handleUpdateItem(q.id, { statement: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#091326] border border-slate-700/80 text-white text-base font-medium focus:outline-none focus:border-sky-400 transition-colors resize-none"
                  />
                </div>
                <div className="lg:col-span-5">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Pembahasan Singkat (Klik untuk mengedit)
                  </label>
                  <textarea
                    rows={2}
                    value={q.explanation}
                    onChange={(e) =>
                      handleUpdateItem(q.id, { explanation: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#091326] border border-slate-700/80 text-slate-200 text-sm focus:outline-none focus:border-sky-400 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky / Action Bar */}
      <div className="rounded-2xl bg-[#0F1E3A] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          Sudah selesai memeriksa daftar soal? Lanjutkan ke halaman kamera untuk menguji gerakan dan memulai permainan.
        </div>
        <button
          type="button"
          onClick={onProceedToCamera}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base flex items-center gap-2.5 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Camera className="w-5 h-5" />
          <span>Lanjut ke Halaman Uji Kamera ({questions.length} Soal)</span>
        </button>
      </div>
    </div>
  );
};
