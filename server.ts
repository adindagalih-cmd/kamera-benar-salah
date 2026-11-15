import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_PANCASILA_QUESTIONS } from './src/data/defaultQuestions.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health & API status endpoint
  app.get('/api/health', (_req, res) => {
    const hasApiKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    res.json({
      status: 'ok',
      geminiConfigured: hasApiKey,
    });
  });

  // Generate True/False (Benar-Salah) Questions via Gemini API
  app.post('/api/generate-questions', async (req, res) => {
    const {
      subject = 'Pendidikan Pancasila',
      topic = 'Aturan, Hak, dan Kewajjiban',
      grade = '3 SD',
      learningObjective = 'Memahami ATURAN, HAK, DAN KEWAJIBAN di RUMAH, SEKOLAH, dan Masyarakat',
      questionCount = 30,
      difficulty = 'Campuran (mudah, sedang, sulit)',
    } = req.body || {};

    const count = Math.max(1, Math.min(50, Number(questionCount) || 30));
    const ai = getGenAIClient();

    if (!ai) {
      // Return fallback curated questions scaled to requested count if API key is not configured
      const fallback = Array.from({ length: count }, (_, idx) => {
        const base = DEFAULT_PANCASILA_QUESTIONS[idx % DEFAULT_PANCASILA_QUESTIONS.length];
        return {
          ...base,
          id: `q-fallback-${idx + 1}-${Date.now()}`,
        };
      });
      res.json({
        source: 'fallback',
        message:
          'Menggunakan paket soal kurikulum bawaan karena GEMINI_API_KEY belum dikonfigurasi pada environment server.',
        questions: fallback,
      });
      return;
    }

    try {
      const prompt = `Buatlah tepat ${count} soal pernyataan Benar-Salah (True/False) yang edukatif, jelas, dan sesuai tingkat perkembangan siswa untuk pembelajaran di kelas dengan rincian berikut:
- Mata Pelajaran: ${subject}
- Materi Pokok: ${topic}
- Kelas / Jenjang: ${grade}
- Tujuan Pembelajaran: ${learningObjective}
- Tingkat Kesulitan: ${difficulty}

Ketentuan wajib setiap soal:
1. "statement": Kalimat pernyataan yang jelas, kontekstual dengan kehidupan sehari-hari siswa (di rumah, sekolah, atau masyarakat), dan dapat dinilai secara tegas apakah BENAR atau SALAH.
2. "answer": boolean (true jika pernyataan BENAR, false jika pernyataan SALAH). Buat proporsi jawaban Benar dan Salah yang seimbang dan acak.
3. "explanation": Pembahasan singkat (1-2 kalimat) yang menjelaskan alasan mengapa pernyataan tersebut Benar atau Salah dengan bahasa yang ramah siswa ${grade}.
4. "difficulty": Pilih salah satu dari "Mudah", "Sedang", atau "Sulit" sesuai tingkat kesulitan (${difficulty}).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah guru ahli kurikulum nasional Indonesia dan pembuat soal asesmen interaktif SD/SMP/SMA. Hasilkan daftar soal Benar-Salah berkualitas tinggi dalam format JSON yang valid.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                statement: {
                  type: Type.STRING,
                  description: 'Pernyataan soal Benar-Salah yang jelas untuk siswa.',
                },
                answer: {
                  type: Type.BOOLEAN,
                  description: 'true jika pernyataan BENAR, false jika pernyataan SALAH.',
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Pembahasan singkat mengapa pernyataan tersebut Benar atau Salah.',
                },
                difficulty: {
                  type: Type.STRING,
                  description: 'Tingkat kesulitan soal: Mudah, Sedang, atau Sulit.',
                },
              },
              required: ['statement', 'answer', 'explanation', 'difficulty'],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Respons AI kosong atau tidak berbentuk array soal.');
      }

      const normalizedQuestions = parsed.slice(0, count).map((item: any, idx: number) => {
        const diffRaw = String(item.difficulty || 'Sedang').toLowerCase();
        let normDiff: 'Mudah' | 'Sedang' | 'Sulit' = 'Sedang';
        if (diffRaw.includes('mudah')) normDiff = 'Mudah';
        else if (diffRaw.includes('sulit') || diffRaw.includes('sukar')) normDiff = 'Sulit';

        return {
          id: `q-ai-${idx + 1}-${Date.now()}`,
          statement: String(item.statement || '').trim(),
          answer: Boolean(item.answer),
          explanation: String(item.explanation || '').trim(),
          difficulty: normDiff,
        };
      });

      res.json({
        source: 'gemini',
        message: `Berhasil membuat ${normalizedQuestions.length} soal Benar-Salah menggunakan Gemini AI.`,
        questions: normalizedQuestions,
      });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      const status = error?.status || 500;
      const errMsg = error?.message || 'Gagal menghubungi Gemini API.';

      // Return both the error message AND fallback questions so the teacher is never blocked
      const fallback = Array.from({ length: count }, (_, idx) => {
        const base = DEFAULT_PANCASILA_QUESTIONS[idx % DEFAULT_PANCASILA_QUESTIONS.length];
        return {
          ...base,
          id: `q-fallback-${idx + 1}-${Date.now()}`,
        };
      });

      res.status(200).json({
        source: 'fallback',
        errorDetail: `Error (${status}): ${errMsg}`,
        message:
          'Terjadi kendala saat menghubungi Gemini AI. Sistem memuat 30 soal contoh sesuai kurikulum agar pembelajaran tetap dapat berjalan lancar.',
        questions: fallback,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kamera Benar-Salah Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
