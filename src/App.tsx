/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  AppStep,
  CameraArenaMode,
  LearningFormConfig,
  QuestionItem,
  StudentAnswerRecord,
} from './types/game';
import {
  DEFAULT_LEARNING_CONFIG,
  DEFAULT_PANCASILA_QUESTIONS,
} from './data/defaultQuestions';
import { LearningFormView } from './components/LearningFormView';
import { QuestionPreviewView } from './components/QuestionPreviewView';
import { CameraArenaView } from './components/CameraArenaView';
import { FinalResultsView } from './components/FinalResultsView';
import { GuideModal } from './components/GuideModal';
import { soundEngine } from './utils/sound';

export default function App() {
  const [step, setStep] = useState<AppStep>('FORM_INPUT');
  const [arenaMode, setArenaMode] = useState<CameraArenaMode>('TRIAL');
  const [config, setConfig] = useState<LearningFormConfig>(
    DEFAULT_LEARNING_CONFIG
  );
  const [questions, setQuestions] = useState<QuestionItem[]>(
    DEFAULT_PANCASILA_QUESTIONS
  );
  const [records, setRecords] = useState<StudentAnswerRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Warn teacher with browser-native confirmation dialog if closing/reloading tab during active game
  useEffect(() => {
    const isGameInProgress = step === 'CAMERA_STAGE' && arenaMode === 'PLAYING';
    if (!isGameInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, arenaMode]);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    soundEngine.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Call backend /api/generate-questions using Gemini API
  const handleGenerateQuestions = useCallback(async () => {
    setIsGenerating(true);
    setStatusMessage('Menghubungi server AI untuk menyusun soal Benar-Salah...');
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setStatusMessage(
          data.message ||
            `Berhasil menyiapkan ${data.questions.length} soal Benar-Salah.`
        );
        setStep('QUESTION_PREVIEW');
      } else {
        throw new Error('Format soal tidak valid.');
      }
    } catch {
      const count = Math.max(1, Math.min(50, config.questionCount || 30));
      const fallback = Array.from({ length: count }, (_, idx) => {
        const base =
          DEFAULT_PANCASILA_QUESTIONS[idx % DEFAULT_PANCASILA_QUESTIONS.length];
        return {
          ...base,
          id: `q-local-${idx + 1}-${Date.now()}`,
        };
      });
      setQuestions(fallback);
      setStatusMessage(
        `Menggunakan ${fallback.length} soal kurikulum bawaan yang siap diedit oleh Guru.`
      );
      setStep('QUESTION_PREVIEW');
    } finally {
      setIsGenerating(false);
    }
  }, [config]);

  const handleResetDefaultQuestions = () => {
    setQuestions(DEFAULT_PANCASILA_QUESTIONS);
    setStatusMessage('Berhasil memuat ulang 30 soal bawaan Pendidikan Pancasila Kelas 3 SD.');
  };

  const handleFinishGame = (finalRecords: StudentAnswerRecord[]) => {
    setRecords(finalRecords);
    setStep('FINAL_RESULTS');
  };

  const handlePlayAgain = () => {
    setRecords([]);
    setArenaMode('TRIAL');
    setStep('CAMERA_STAGE');
  };

  const handleBackToHome = () => {
    setRecords([]);
    setArenaMode('TRIAL');
    setStep('FORM_INPUT');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A1428] text-slate-100">
      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/90 bg-[#081021]">
        {/* Zone 1: Brand Wordmark (single text element) */}
        <button
          type="button"
          onClick={() => setStep('FORM_INPUT')}
          className="text-lg font-extrabold tracking-tight text-white font-display whitespace-nowrap shrink-0 cursor-pointer"
        >
          KAMERA BENAR-SALAH
        </button>

        {/* Zone 2: 4–5 Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setStep('FORM_INPUT')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              step === 'FORM_INPUT' ? 'text-sky-400 font-bold underline' : ''
            }`}
          >
            1. Form Materi
          </button>
          <button
            type="button"
            onClick={() => setStep('QUESTION_PREVIEW')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              step === 'QUESTION_PREVIEW' ? 'text-sky-400 font-bold underline' : ''
            }`}
          >
            2. Pratinjau Soal
          </button>
          <button
            type="button"
            onClick={() => {
              setArenaMode('TRIAL');
              setStep('CAMERA_STAGE');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              step === 'CAMERA_STAGE' ? 'text-sky-400 font-bold underline' : ''
            }`}
          >
            3. Arena Kamera
          </button>
          <button
            type="button"
            onClick={() => setStep('FINAL_RESULTS')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              step === 'FINAL_RESULTS' ? 'text-sky-400 font-bold underline' : ''
            }`}
          >
            4. Hasil Akhir
          </button>
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Panduan
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Suara Mati</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span>Suara Aktif</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center">
        {step === 'FORM_INPUT' && (
          <LearningFormView
            config={config}
            onChangeConfig={setConfig}
            onGenerateAI={handleGenerateQuestions}
            onUseExistingQuestions={() => setStep('QUESTION_PREVIEW')}
            isGenerating={isGenerating}
            questionCountReady={questions.length}
            statusMessage={statusMessage}
          />
        )}

        {step === 'QUESTION_PREVIEW' && (
          <QuestionPreviewView
            config={config}
            questions={questions}
            onUpdateQuestions={setQuestions}
            onResetDefaultQuestions={handleResetDefaultQuestions}
            onRegenerateAI={handleGenerateQuestions}
            isGenerating={isGenerating}
            onBackToForm={() => setStep('FORM_INPUT')}
            onProceedToCamera={() => {
              setArenaMode('TRIAL');
              setStep('CAMERA_STAGE');
            }}
            statusMessage={statusMessage}
          />
        )}

        {/* Single Unified Camera Arena Component for BOTH Trial & Gameplay */}
        {step === 'CAMERA_STAGE' && (
          <CameraArenaView
            config={config}
            questions={questions}
            arenaMode={arenaMode}
            onChangeArenaMode={setArenaMode}
            onBackToPreview={() => setStep('QUESTION_PREVIEW')}
            onFinishGame={handleFinishGame}
          />
        )}

        {step === 'FINAL_RESULTS' && (
          <FinalResultsView
            config={config}
            records={records}
            totalQuestionCount={questions.length}
            onPlayAgain={handlePlayAgain}
            onBackToHome={handleBackToHome}
          />
        )}
      </main>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
