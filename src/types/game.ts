export type DifficultyLevel = 'Mudah' | 'Sedang' | 'Sulit';

export interface LearningFormConfig {
  subject: string;
  topic: string;
  grade: string;
  learningObjective: string;
  questionCount: number;
  difficulty: string;
  timerSeconds: number;
}

export interface QuestionItem {
  id: string;
  statement: string;
  answer: boolean; // true = BENAR (Geser Kiri), false = SALAH (Geser Kanan)
  explanation: string;
  difficulty: DifficultyLevel;
}

export interface StudentAnswerRecord {
  questionId: string;
  statement: string;
  correctAnswer: boolean;
  studentAnswer: boolean | null; // null if timeout / tidak terjawab
  isCorrect: boolean;
  explanation: string;
  difficulty: DifficultyLevel;
  timeSpentSeconds: number;
}

export type AppStep =
  | 'FORM_INPUT'
  | 'QUESTION_PREVIEW'
  | 'CAMERA_STAGE'
  | 'FINAL_RESULTS';

export type CameraArenaMode = 'TRIAL' | 'PLAYING';

export type GestureSide = 'LEFT' | 'CENTER' | 'RIGHT';
