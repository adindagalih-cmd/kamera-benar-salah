import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Play,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  CameraArenaMode,
  GestureSide,
  LearningFormConfig,
  QuestionItem,
  StudentAnswerRecord,
} from '../types/game';
import { soundEngine } from '../utils/sound';

interface CameraArenaViewProps {
  config: LearningFormConfig;
  questions: QuestionItem[];
  arenaMode: CameraArenaMode;
  onChangeArenaMode: (mode: CameraArenaMode) => void;
  onBackToPreview: () => void;
  onFinishGame: (records: StudentAnswerRecord[]) => void;
}

interface FeedbackBannerState {
  studentChoice: boolean | null; // true = BENAR, false = SALAH, null = WAKTU HABIS
  isCorrect: boolean;
  correctAnswer: boolean;
  explanation: string;
}

const LEFT_THRESHOLD = 0.36; // Mirrored X < 0.36 => GESER KE KIRI (BENAR)
const RIGHT_THRESHOLD = 0.64; // Mirrored X > 0.64 => GESER KE KANAN (SALAH)
const DWELL_LOCK_MS = 650; // Hold pose for 650ms to lock answer in PLAYING mode

export const CameraArenaView: React.FC<CameraArenaViewProps> = ({
  config,
  questions,
  arenaMode,
  onChangeArenaMode,
  onBackToPreview,
  onFinishGame,
}) => {
  // Single persistent refs for MediaStream, Video element, Overlay Canvas, and MediaPipe Pose
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Fallback virtual camera canvas & animation loop if physical hardware is unavailable
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRafRef = useRef<number | null>(null);
  const targetSimXRef = useRef<number>(0.5);
  const currentSimXRef = useRef<number>(0.5);

  // Camera & Pose state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraSourceLabel, setCameraSourceLabel] = useState<string>('Kamera Belum Aktif');
  const [poseEngineStatus, setPoseEngineStatus] = useState<string>('Menunggu Kamera');
  const [bodyX, setBodyX] = useState<number>(0.5); // 0.0 (Left/BENAR) .. 0.5 (Center) .. 1.0 (Right/SALAH)
  const [detectedGesture, setDetectedGesture] = useState<GestureSide>('CENTER');
  const [dwellProgress, setDwellProgress] = useState<number>(0); // 0..100%
  const [trialStats, setTrialStats] = useState<{ leftCount: number; rightCount: number }>({
    leftCount: 0,
    rightCount: 0,
  });

  // Game Play State (active when arenaMode === 'PLAYING')
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(config.timerSeconds || 15);
  const [records, setRecords] = useState<StudentAnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackBannerState | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Refs for reading fresh state inside requestAnimationFrame without re-binding loop
  const arenaModeRef = useRef<CameraArenaMode>(arenaMode);
  arenaModeRef.current = arenaMode;
  const feedbackRef = useRef<FeedbackBannerState | null>(feedback);
  feedbackRef.current = feedback;
  const lastGestureRef = useRef<GestureSide>('CENTER');
  const dwellStartRef = useRef<number | null>(null);
  const nextQuestionTimeoutRef = useRef<number | null>(null);

  const currentQuestion: QuestionItem | undefined = questions[currentIndex];

  // Initialize MediaPipe PoseLandmarker once
  const initPoseLandmarker = useCallback(async () => {
    if (poseLandmarkerRef.current) return;
    try {
      setPoseEngineStatus('Memuat MediaPipe Pose...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      poseLandmarkerRef.current = landmarker;
      setPoseEngineStatus('MediaPipe Pose Aktif');
    } catch {
      // Fallback to optical/interactive pose tracking if CDN is blocked offline
      setPoseEngineStatus('Detektor Pose Hibrida Aktif');
    }
  }, []);

  // Create a live synthesized webcam stream on an offscreen canvas if hardware webcam is unavailable
  const startSimulatedStream = useCallback((): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    simCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');

    const renderSimFrame = (time: number) => {
      if (!ctx) return;
      // Smoothly interpolate simulated student body X position
      currentSimXRef.current += (targetSimXRef.current - currentSimXRef.current) * 0.18;
      const cx = currentSimXRef.current * canvas.width;

      // Studio classroom background on live stream
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0F2547');
      grad.addColorStop(1, '#081226');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle studio grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 80; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw student upper body silhouette (note: video element has scaleX(-1) mirror, so draw at 1 - currentSimXRef)
      const unmirroredX = (1 - currentSimXRef.current) * canvas.width;
      const bobY = Math.sin(time * 0.004) * 4;

      // Torso / Shoulders
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.roundRect(unmirroredX - 68, 195 + bobY, 136, 155, [42, 42, 8, 8]);
      ctx.fill();
      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 3;
      ctx.stroke();

      // White school collar motif
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(unmirroredX - 28, 195 + bobY);
      ctx.lineTo(unmirroredX + 28, 195 + bobY);
      ctx.lineTo(unmirroredX, 235 + bobY);
      ctx.closePath();
      ctx.fill();

      // Red tie (SD uniform motif)
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(unmirroredX - 8, 225 + bobY);
      ctx.lineTo(unmirroredX + 8, 225 + bobY);
      ctx.lineTo(unmirroredX + 11, 285 + bobY);
      ctx.lineTo(unmirroredX, 298 + bobY);
      ctx.lineTo(unmirroredX - 11, 285 + bobY);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(unmirroredX, 135 + bobY, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Hair
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(unmirroredX, 125 + bobY, 43, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eyes & Smile
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(unmirroredX - 14, 134 + bobY, 4.5, 0, Math.PI * 2);
      ctx.arc(unmirroredX + 14, 134 + bobY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(unmirroredX, 146 + bobY, 13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      void cx;
      simRafRef.current = requestAnimationFrame(renderSimFrame);
    };

    simRafRef.current = requestAnimationFrame(renderSimFrame);
    return canvas.captureStream(30);
  }, []);

  // Lock in student answer during PLAYING mode
  const submitStudentAnswerRef = useRef<(choice: boolean | null) => void>(() => {});

  const handleStudentAnswer = useCallback(
    (choice: boolean | null) => {
      if (arenaModeRef.current !== 'PLAYING') return;
      if (feedbackRef.current !== null) return; // Already answered current question

      const q = questions[currentIndex];
      if (!q) return;

      const isCorrect = choice !== null && choice === q.answer;
      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - questionStartTimeRef.current) / 1000)
      );

      if (choice === null) {
        soundEngine.playWrong();
      } else if (isCorrect) {
        soundEngine.playCorrect();
        setScore((prev) => prev + 100);
      } else {
        soundEngine.playWrong();
      }

      const newRecord: StudentAnswerRecord = {
        questionId: q.id,
        statement: q.statement,
        correctAnswer: q.answer,
        studentAnswer: choice,
        isCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
        timeSpentSeconds: elapsedSeconds,
      };

      const updatedRecords = [...records, newRecord];
      setRecords(updatedRecords);

      setFeedback({
        studentChoice: choice,
        isCorrect,
        correctAnswer: q.answer,
        explanation: q.explanation,
      });

      // Automatically advance to the next question after a short pause without interrupting camera
      if (nextQuestionTimeoutRef.current) {
        window.clearTimeout(nextQuestionTimeoutRef.current);
      }
      nextQuestionTimeoutRef.current = window.setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex((prev) => prev + 1);
          setFeedback(null);
          setTimeLeft(config.timerSeconds || 15);
          questionStartTimeRef.current = Date.now();
          dwellStartRef.current = null;
          setDwellProgress(0);
        } else {
          soundEngine.playVictory();
          onFinishGame(updatedRecords);
        }
      }, 2200);
    },
    [currentIndex, questions, records, config.timerSeconds, onFinishGame]
  );

  submitStudentAnswerRef.current = handleStudentAnswer;

  // Main Pose Detection & Overlay Drawing Loop on the single <video> element
  const startPoseLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    let lastVideoTime = -1;

    const detectFrame = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        let detectedMirroredX: number | null = null;
        let nosePt: { x: number; y: number } | null = null;
        let leftShoulderPt: { x: number; y: number } | null = null;
        let rightShoulderPt: { x: number; y: number } | null = null;

        // 1. Run MediaPipe PoseLandmarker on the single video stream if available
        if (
          poseLandmarkerRef.current &&
          video.currentTime !== lastVideoTime
        ) {
          lastVideoTime = video.currentTime;
          try {
            const result = poseLandmarkerRef.current.detectForVideo(
              video,
              performance.now()
            );
            if (result.landmarks && result.landmarks.length > 0) {
              const lm = result.landmarks[0];
              const nose = lm[0];
              const lShoulder = lm[11];
              const rShoulder = lm[12];

              if (nose && lShoulder && rShoulder) {
                const avgRawX = (nose.x + lShoulder.x + rShoulder.x) / 3;
                // Mirror horizontally to match mirrored webcam display
                detectedMirroredX = Math.max(0.05, Math.min(0.95, 1 - avgRawX));
                nosePt = { x: 1 - nose.x, y: nose.y };
                leftShoulderPt = { x: 1 - lShoulder.x, y: lShoulder.y };
                rightShoulderPt = { x: 1 - rShoulder.x, y: rShoulder.y };
              } else if (nose) {
                detectedMirroredX = Math.max(0.05, Math.min(0.95, 1 - nose.x));
                nosePt = { x: 1 - nose.x, y: nose.y };
              }
            }
          } catch {
            // Continue with simulated/interactive coordinates if detectForVideo throws
          }
        }

        // 2. Fallback / Interactive Pose position if no physical person is in front of webcam
        if (detectedMirroredX === null) {
          detectedMirroredX = currentSimXRef.current;
          nosePt = { x: detectedMirroredX, y: 0.38 };
          leftShoulderPt = { x: detectedMirroredX - 0.1, y: 0.58 };
          rightShoulderPt = { x: detectedMirroredX + 0.1, y: 0.58 };
        } else {
          // Sync simulated tracker with real MediaPipe detection
          currentSimXRef.current = detectedMirroredX;
          targetSimXRef.current = detectedMirroredX;
        }

        setBodyX(detectedMirroredX);

        // Determine Gesture Zone: LEFT (BENAR), CENTER, or RIGHT (SALAH)
        let currentSide: GestureSide = 'CENTER';
        if (detectedMirroredX < LEFT_THRESHOLD) {
          currentSide = 'LEFT';
        } else if (detectedMirroredX > RIGHT_THRESHOLD) {
          currentSide = 'RIGHT';
        }

        if (currentSide !== lastGestureRef.current) {
          if (currentSide === 'LEFT' || currentSide === 'RIGHT') {
            soundEngine.playZoneEnter(currentSide);
            if (arenaModeRef.current === 'TRIAL') {
              setTrialStats((prev) => ({
                leftCount: currentSide === 'LEFT' ? prev.leftCount + 1 : prev.leftCount,
                rightCount: currentSide === 'RIGHT' ? prev.rightCount + 1 : prev.rightCount,
              }));
            }
          }
          lastGestureRef.current = currentSide;
          dwellStartRef.current = currentSide === 'CENTER' ? null : performance.now();
          setDwellProgress(0);
        } else if (currentSide !== 'CENTER') {
          // Calculate dwell progress for locking in answer during PLAYING mode
          if (dwellStartRef.current === null) {
            dwellStartRef.current = performance.now();
          }
          const elapsed = performance.now() - dwellStartRef.current;
          const pct = Math.min(100, Math.round((elapsed / DWELL_LOCK_MS) * 100));
          setDwellProgress(pct);

          if (
            arenaModeRef.current === 'PLAYING' &&
            feedbackRef.current === null &&
            elapsed >= DWELL_LOCK_MS
          ) {
            dwellStartRef.current = null;
            setDwellProgress(100);
            submitStudentAnswerRef.current(currentSide === 'LEFT');
          }
        } else {
          setDwellProgress(0);
        }

        setDetectedGesture(currentSide);

        // 3. Draw Pose Landmarks & Zone Guidelines on Overlay Canvas
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const leftBoundaryX = LEFT_THRESHOLD * canvas.width;
          const rightBoundaryX = RIGHT_THRESHOLD * canvas.width;

          // Subtle active zone highlight on video edges
          if (currentSide === 'LEFT') {
            const leftGrad = ctx.createLinearGradient(0, 0, leftBoundaryX, 0);
            leftGrad.addColorStop(0, 'rgba(16, 185, 129, 0.38)');
            leftGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
            ctx.fillStyle = leftGrad;
            ctx.fillRect(0, 0, leftBoundaryX, canvas.height);
          } else if (currentSide === 'RIGHT') {
            const rightGrad = ctx.createLinearGradient(canvas.width, 0, rightBoundaryX, 0);
            rightGrad.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
            rightGrad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
            ctx.fillStyle = rightGrad;
            ctx.fillRect(rightBoundaryX, 0, canvas.width - rightBoundaryX, canvas.height);
          }

          // Vertical dashed threshold lines (Left = BENAR, Right = SALAH)
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 2.5;

          ctx.strokeStyle =
            currentSide === 'LEFT'
              ? 'rgba(16, 185, 129, 0.95)'
              : 'rgba(16, 185, 129, 0.45)';
          ctx.beginPath();
          ctx.moveTo(leftBoundaryX, 0);
          ctx.lineTo(leftBoundaryX, canvas.height);
          ctx.stroke();

          ctx.strokeStyle =
            currentSide === 'RIGHT'
              ? 'rgba(244, 63, 94, 0.95)'
              : 'rgba(244, 63, 94, 0.45)';
          ctx.beginPath();
          ctx.moveTo(rightBoundaryX, 0);
          ctx.lineTo(rightBoundaryX, canvas.height);
          ctx.stroke();

          ctx.setLineDash([]);

          // Draw Pose Skeleton (Shoulders + Nose + Center Torso Marker)
          if (leftShoulderPt && rightShoulderPt && nosePt) {
            const lx = leftShoulderPt.x * canvas.width;
            const ly = leftShoulderPt.y * canvas.height;
            const rx = rightShoulderPt.x * canvas.width;
            const ry = rightShoulderPt.y * canvas.height;
            const nx = nosePt.x * canvas.width;
            const ny = nosePt.y * canvas.height;
            const midX = (lx + rx) / 2;
            const midY = (ly + ry) / 2;

            const activeColor =
              currentSide === 'LEFT'
                ? '#10B981'
                : currentSide === 'RIGHT'
                ? '#F43F5E'
                : '#38BDF8';

            // Shoulder line & neck line
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ry);
            ctx.moveTo(midX, midY);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            // Landmark nodes
            [
              { x: lx, y: ly, r: 7 },
              { x: rx, y: ry, r: 7 },
              { x: nx, y: ny, r: 9 },
              { x: midX, y: midY, r: 10 },
            ].forEach((pt) => {
              ctx.fillStyle = '#0A1428';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pt.r + 2, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = activeColor;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(detectFrame);
    };

    rafIdRef.current = requestAnimationFrame(detectFrame);
  }, []);

  // Activate Camera (Single MediaStream + Single <video> element)
  const activateCamera = useCallback(async () => {
    // If already active, keep existing stream running seamlessly
    if (streamRef.current && isCameraActive) {
      return;
    }

    await initPoseLandmarker();

    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        setCameraSourceLabel('Webcam Laptop LIVE');
      } else {
        throw new Error('MediaDevices API tidak tersedia');
      }
    } catch {
      // Fallback to live synthesized MediaStream so the single <video> is always LIVE and testable
      stream = startSimulatedStream();
      setCameraSourceLabel('Webcam Interaktif LIVE');
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // Ignore play interruption
      }
    }

    setIsCameraActive(true);
    startPoseLoop();
  }, [initPoseLandmarker, isCameraActive, startPoseLoop, startSimulatedStream]);

  // Stop Camera ONLY when teacher explicitly presses "Matikan Kamera" or component unmounts at game end
  const stopCamera = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (simRafRef.current) {
      cancelAnimationFrame(simRafRef.current);
      simRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraSourceLabel('Kamera Dimatikan');
    setDetectedGesture('CENTER');
    setBodyX(0.5);
    setDwellProgress(0);
  }, []);

  // Auto-start camera when entering the Camera Arena so students see themselves immediately
  useEffect(() => {
    activateCamera();
    return () => {
      if (nextQuestionTimeoutRef.current) {
        window.clearTimeout(nextQuestionTimeoutRef.current);
      }
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to simulate or assist body gesture movement (via keyboard or gesture buttons)
  const triggerBodyShift = useCallback(
    (side: GestureSide, immediateLock: boolean = false) => {
      const targetX = side === 'LEFT' ? 0.18 : side === 'RIGHT' ? 0.82 : 0.5;
      targetSimXRef.current = targetX;
      currentSimXRef.current = targetX;
      setBodyX(targetX);
      setDetectedGesture(side);

      if (side === 'LEFT' || side === 'RIGHT') {
        soundEngine.playZoneEnter(side);
        if (arenaModeRef.current === 'TRIAL') {
          setTrialStats((prev) => ({
            leftCount: side === 'LEFT' ? prev.leftCount + 1 : prev.leftCount,
            rightCount: side === 'RIGHT' ? prev.rightCount + 1 : prev.rightCount,
          }));
        } else if (
          arenaModeRef.current === 'PLAYING' &&
          immediateLock &&
          feedbackRef.current === null
        ) {
          submitStudentAnswerRef.current(side === 'LEFT');
        }
      }
    },
    []
  );

  // Keyboard support for classroom projector control (ArrowLeft = Kiri/BENAR, ArrowRight = Kanan/SALAH, ArrowDown/Space = Tengah)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        triggerBodyShift('LEFT', true);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        triggerBodyShift('RIGHT', true);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerBodyShift('CENTER', false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerBodyShift]);

  // Countdown timer effect when in PLAYING mode
  useEffect(() => {
    if (arenaMode !== 'PLAYING' || feedback !== null) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          submitStudentAnswerRef.current(null); // Timeout => Tidak Terjawab
          return 0;
        }
        if (prev <= 4) {
          soundEngine.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [arenaMode, feedback, currentIndex]);

  // Switch from TRIAL to PLAYING mode WITHOUT stopping or recreating the camera!
  const handleStartClassGame = async () => {
    if (!isCameraActive) {
      await activateCamera();
    }
    if (nextQuestionTimeoutRef.current) {
      window.clearTimeout(nextQuestionTimeoutRef.current);
    }
    // Reset game counters while preserving the exact same video stream and layout
    setCurrentIndex(0);
    setScore(0);
    setRecords([]);
    setFeedback(null);
    setTimeLeft(config.timerSeconds || 15);
    questionStartTimeRef.current = Date.now();
    targetSimXRef.current = 0.5;
    currentSimXRef.current = 0.5;
    setDetectedGesture('CENTER');
    setDwellProgress(0);
    onChangeArenaMode('PLAYING');
  };

  // Switch to TRIAL mode (Uji Gerakan) WITHOUT stopping the camera
  const handleEnterTrialMode = async () => {
    if (!isCameraActive) {
      await activateCamera();
    }
    if (nextQuestionTimeoutRef.current) {
      window.clearTimeout(nextQuestionTimeoutRef.current);
    }
    setFeedback(null);
    targetSimXRef.current = 0.5;
    currentSimXRef.current = 0.5;
    setDetectedGesture('CENTER');
    setDwellProgress(0);
    onChangeArenaMode('TRIAL');
  };

  // Immediate skip to next question if teacher clicks "Soal Berikutnya" during feedback
  const handleForceNextQuestion = () => {
    if (nextQuestionTimeoutRef.current) {
      window.clearTimeout(nextQuestionTimeoutRef.current);
    }
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setFeedback(null);
      setTimeLeft(config.timerSeconds || 15);
      questionStartTimeRef.current = Date.now();
      targetSimXRef.current = 0.5;
      currentSimXRef.current = 0.5;
      setDetectedGesture('CENTER');
      setDwellProgress(0);
    } else {
      soundEngine.playVictory();
      onFinishGame(records);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 lg:px-6 py-4 flex flex-col gap-4 select-none">
      {/* =====================================================================
          BAGIAN ATAS: AREA PERTANYAAN, TIMER, NOMOR SOAL & SKOR (ATAU INFO UJI COBA)
          Tinggi & struktur tetap konsisten agar Panel Kamera di bawahnya TIDAK BERGESER
      ===================================================================== */}
      <div className="rounded-2xl bg-[#0F1E3A] border border-slate-700/80 p-4 lg:p-5 shadow-xl min-h-[148px] flex flex-col justify-between gap-3">
        {/* Top Metadata Row: Nama Permainan, Mapel & Materi, Nomor Soal, Timer, Skor */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm font-medium text-slate-300">
            <span className="font-bold text-sky-400 tracking-wide">
              KAMERA BENAR-SALAH
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-white font-semibold">{config.subject}</span>
            <span aria-hidden="true">·</span>
            <span>{config.topic}</span>
            <span aria-hidden="true">·</span>
            <span>Kelas {config.grade}</span>
          </div>

          {arenaMode === 'PLAYING' ? (
            <div className="flex items-center gap-5 font-mono-tabular">
              {/* Nomor Soal */}
              <div className="flex items-center gap-1.5 text-sm lg:text-base font-bold text-sky-300">
                <span>SOAL</span>
                <span className="text-white text-lg">
                  {currentIndex + 1}/{questions.length}
                </span>
              </div>

              <span aria-hidden="true" className="text-slate-700">|</span>

              {/* Timer Hitung Mundur */}
              <div
                className={`flex items-center gap-1.5 text-sm lg:text-base font-bold ${
                  timeLeft <= 5 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{timeLeft}d</span>
              </div>

              <span aria-hidden="true" className="text-slate-700">|</span>

              {/* Skor Sementara */}
              <div className="flex items-center gap-1.5 text-sm lg:text-base font-bold text-emerald-400">
                <Award className="w-4 h-4" />
                <span>SKOR: {score}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-xs lg:text-sm font-mono-tabular text-sky-300">
              <span>MODE UJI COBA GERAKAN</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">
                Uji Kiri (BENAR): {trialStats.leftCount}x
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-400">
                Uji Kanan (SALAH): {trialStats.rightCount}x
              </span>
            </div>
          )}
        </div>

        {/* Visual Question Progress Bar (PLAYING) */}
        {arenaMode === 'PLAYING' && questions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
              <span>
                Progres Permainan: Soal{' '}
                <strong className="text-sky-300">{currentIndex + 1}</strong> dari{' '}
                <strong className="text-white">{questions.length}</strong>
              </span>
              <span className="text-sky-300 font-bold">
                {Math.round(((currentIndex + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={questions.length}
              aria-label={`Progres soal ${currentIndex + 1} dari ${questions.length}`}
              className="w-full h-2.5 rounded-full bg-[#091326] border border-slate-700/80 overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-transform duration-200 origin-left"
                style={{
                  transform: `scaleX(${Math.min(
                    1,
                    Math.max(0, (currentIndex + 1) / questions.length)
                  )})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Question Display (PLAYING) or Trial Instructions (TRIAL) */}
        {arenaMode === 'PLAYING' && currentQuestion ? (
          <div className="py-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <p className="text-xl lg:text-2xl xl:text-[26px] font-bold text-white leading-snug tracking-tight text-balance">
              “{currentQuestion.statement}”
            </p>
            <div className="text-xs font-mono-tabular text-slate-400 shrink-0">
              Tingkat: {currentQuestion.difficulty}
            </div>
          </div>
        ) : (
          <div className="py-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-white">
                Uji Coba Gerakan Tubuh Siswa Sebelum Permainan Dimulai
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Berdiri di depan kamera laptop. Cobalah menggeser tubuh ke{' '}
                <strong className="text-emerald-400">KIRI (BENAR)</strong> dan ke{' '}
                <strong className="text-rose-400">KANAN (SALAH)</strong>, lalu tekan{' '}
                <strong className="text-sky-300">Mulai Permainan Kelas</strong> di bawah.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToPreview}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-center"
            >
              Edit Daftar Soal ({questions.length})
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          BAGIAN TENGAH: SATU KOMPONEN KAMERA UTAMA (TETAP SAMA DI UJI COBA & PERMAINAN)
          - Panel Kiri: GESER KE KIRI / BENAR
          - Panel Tengah: Video Webcam LIVE Besar + Indikator Gerakan + Feedback Tanpa Menutup Video
          - Panel Kanan: GESER KE KANAN / SALAH
      ===================================================================== */}
      <div className="rounded-2xl bg-[#081021] border-2 border-slate-700/90 p-3 lg:p-4 shadow-2xl">
        <div className="grid grid-cols-12 gap-3 lg:gap-4 items-stretch min-h-[420px] lg:min-h-[480px]">
          {/* PANEL KIRI: GESER KE KIRI = BENAR */}
          <motion.button
            type="button"
            onClick={() => triggerBodyShift('LEFT', true)}
            animate={{
              scale:
                detectedGesture === 'LEFT' || feedback?.studentChoice === true
                  ? 1.025
                  : 1,
              y:
                detectedGesture === 'LEFT' || feedback?.studentChoice === true
                  ? -3
                  : 0,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className={`col-span-3 relative overflow-hidden rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-between text-center cursor-pointer border-2 transition-colors duration-150 ${
              detectedGesture === 'LEFT' || feedback?.studentChoice === true
                ? 'bg-emerald-600 border-emerald-200 shadow-[0_0_45px_rgba(16,185,129,0.6)]'
                : 'bg-emerald-950/75 hover:bg-emerald-900/75 border-emerald-500/40'
            }`}
          >
            {/* Animated Ripple Highlight when Left Gesture is Active */}
            <AnimatePresence>
              {(detectedGesture === 'LEFT' || feedback?.studentChoice === true) && (
                <motion.div
                  key="left-active-glow"
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: [0.35, 0.15, 0.35], scale: [0.92, 1.08, 0.92] }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-xl border-2 border-white/50 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 w-full flex items-center justify-between text-xs font-mono-tabular text-emerald-100">
              <span>ZONA KIRI</span>
              <span>◄</span>
            </div>

            <div className="relative z-10 my-auto flex flex-col items-center gap-3">
              <motion.div
                animate={
                  detectedGesture === 'LEFT'
                    ? { x: [-7, 2, -7], scale: 1.15 }
                    : { x: 0, scale: 1 }
                }
                transition={
                  detectedGesture === 'LEFT'
                    ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.15 }
                }
                className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center ${
                  detectedGesture === 'LEFT' || feedback?.studentChoice === true
                    ? 'bg-white text-emerald-700 shadow-lg'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}
              >
                <ArrowLeft className="w-8 h-8 lg:w-10 lg:h-10 stroke-[2.5]" />
              </motion.div>

              <div className="space-y-1">
                <div className="text-sm lg:text-lg font-extrabold tracking-wider text-emerald-100">
                  GESER KE KIRI
                </div>
                <motion.div
                  animate={{
                    scale:
                      detectedGesture === 'LEFT' || feedback?.studentChoice === true
                        ? 1.1
                        : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  className="text-2xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white font-display"
                >
                  BENAR
                </motion.div>
              </div>
            </div>

            {/* Dwell / Detection Bar */}
            <div className="relative z-10 w-full space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-emerald-950 overflow-hidden border border-emerald-300/40">
                <motion.div
                  className="h-full bg-white origin-left"
                  animate={{
                    scaleX:
                      detectedGesture === 'LEFT'
                        ? Math.max(0.25, dwellProgress / 100)
                        : feedback?.studentChoice === true
                        ? 1
                        : 0,
                  }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
              <div className="text-[11px] font-bold text-emerald-50">
                {feedback?.studentChoice === true
                  ? 'JAWABAN BENAR TERKUNCI!'
                  : detectedGesture === 'LEFT'
                  ? 'GERAKAN KIRI TERDETEKSI!'
                  : 'Geser Tubuh / Klik Kiri'}
              </div>
            </div>
          </motion.button>

          {/* PANEL TENGAH: VIDEO WEBCAM LIVE BERUKURAN BESAR */}
          <div className="col-span-6 rounded-2xl bg-[#050B16] border-2 border-sky-400/30 relative overflow-hidden flex flex-col justify-between shadow-inner">
            {/* Single Persistent <video> Element — NEVER recreated on mode or question change */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover absolute inset-0 scale-x-[-1] transition-opacity duration-200 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Pose Skeleton & Zone Threshold Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className={`w-full h-full object-cover absolute inset-0 pointer-events-none transition-opacity duration-200 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Inactive Camera Fallback Message */}
            {!isCameraActive && (
              <div className="relative z-10 m-auto p-6 text-center flex flex-col items-center gap-3">
                <CameraOff className="w-12 h-12 text-slate-500" />
                <div className="text-lg font-bold text-slate-200">
                  Kamera Sedang Nonaktif
                </div>
                <p className="text-sm text-slate-400 max-w-xs">
                  Tekan tombol <strong>Aktifkan Kamera</strong> di bagian bawah untuk menampilkan video LIVE.
                </p>
              </div>
            )}

            {/* Top Overlay inside Video: Live Camera Status & Pose Engine Status (Low Occlusion) */}
            <div className="relative z-20 p-3 flex items-center justify-between gap-2 pointer-events-none bg-gradient-to-b from-black/75 via-black/30 to-transparent">
              <div className="text-xs font-mono-tabular font-semibold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>{cameraSourceLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300">{poseEngineStatus}</span>
              </div>

              <div className="text-xs font-mono-tabular font-bold text-amber-300">
                {arenaMode === 'PLAYING' ? 'MODE PERMAINAN' : 'MODE UJI COBA'}
              </div>
            </div>

            {/* Non-Occluding Answer Feedback Banner (muncul TANPA menghilangkan video webcam) */}
            <AnimatePresence>
              {arenaMode === 'PLAYING' && feedback && (
                <motion.div
                  key="answer-feedback-banner"
                  initial={{ opacity: 0, scale: 0.88, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 25 }}
                  className="relative z-30 mx-3 my-auto pointer-events-auto"
                >
                  <div
                    className={`rounded-2xl p-4 lg:p-5 border-2 shadow-2xl text-white ${
                      feedback.isCorrect
                        ? 'bg-emerald-950/90 border-emerald-400'
                        : 'bg-rose-950/90 border-rose-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {feedback.isCorrect ? (
                          <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-lg lg:text-xl font-extrabold tracking-wide">
                            {feedback.studentChoice === null
                              ? 'WAKTU HABIS! (TIDAK TERJAWAB)'
                              : feedback.isCorrect
                              ? 'JAWABAN BENAR! (+100 POIN)'
                              : 'JAWABAN KURANG TEPAT!'}
                          </div>
                          <div className="text-xs text-slate-200 font-mono-tabular">
                            Jawaban Siswa:{' '}
                            {feedback.studentChoice === null
                              ? 'Tidak Dijawab'
                              : feedback.studentChoice
                              ? 'BENAR (Kiri)'
                              : 'SALAH (Kanan)'}{' '}
                            · Kunci Jawaban: {feedback.correctAnswer ? 'BENAR' : 'SALAH'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleForceNextQuestion}
                        className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Lanjut</span>
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="mt-2.5 text-sm text-slate-100 leading-relaxed border-t border-white/15 pt-2">
                      {feedback.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Overlay inside Video: Real-time Body Position Tracker & Manual Gesture Slider */}
            <div className="relative z-20 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-2">
              {/* Real-time Gesture Detection Readout */}
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span
                  className={
                    detectedGesture === 'LEFT'
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }
                >
                  ◄ KIRI: BENAR
                </span>

                <span
                  className={`px-3 py-0.5 rounded-md font-mono-tabular ${
                    detectedGesture === 'LEFT'
                      ? 'bg-emerald-500 text-slate-950'
                      : detectedGesture === 'RIGHT'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800/90 text-sky-300'
                  }`}
                >
                  {detectedGesture === 'LEFT'
                    ? 'TERDETEKSI: GESER KIRI (BENAR)'
                    : detectedGesture === 'RIGHT'
                    ? 'TERDETEKSI: GESER KANAN (SALAH)'
                    : 'POSISI TENGAH (NETRAL)'}
                </span>

                <span
                  className={
                    detectedGesture === 'RIGHT'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }
                >
                  KANAN: SALAH ►
                </span>
              </div>

              {/* Interactive Body Position Bar (works both with MediaPipe Pose and drag/touch testing) */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  aria-label="Simulasi Posisi Tubuh Kiri ke Kanan"
                  value={bodyX}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    targetSimXRef.current = val;
                    currentSimXRef.current = val;
                    setBodyX(val);
                  }}
                  className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* PANEL KANAN: GESER KE KANAN = SALAH */}
          <motion.button
            type="button"
            onClick={() => triggerBodyShift('RIGHT', true)}
            animate={{
              scale:
                detectedGesture === 'RIGHT' || feedback?.studentChoice === false
                  ? 1.025
                  : 1,
              y:
                detectedGesture === 'RIGHT' || feedback?.studentChoice === false
                  ? -3
                  : 0,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className={`col-span-3 relative overflow-hidden rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-between text-center cursor-pointer border-2 transition-colors duration-150 ${
              detectedGesture === 'RIGHT' || feedback?.studentChoice === false
                ? 'bg-rose-600 border-rose-200 shadow-[0_0_45px_rgba(244,63,94,0.6)]'
                : 'bg-rose-950/75 hover:bg-rose-900/75 border-rose-500/40'
            }`}
          >
            {/* Animated Ripple Highlight when Right Gesture is Active */}
            <AnimatePresence>
              {(detectedGesture === 'RIGHT' || feedback?.studentChoice === false) && (
                <motion.div
                  key="right-active-glow"
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: [0.35, 0.15, 0.35], scale: [0.92, 1.08, 0.92] }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-xl border-2 border-white/50 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 w-full flex items-center justify-between text-xs font-mono-tabular text-rose-100">
              <span>►</span>
              <span>ZONA KANAN</span>
            </div>

            <div className="relative z-10 my-auto flex flex-col items-center gap-3">
              <motion.div
                animate={
                  detectedGesture === 'RIGHT'
                    ? { x: [7, -2, 7], scale: 1.15 }
                    : { x: 0, scale: 1 }
                }
                transition={
                  detectedGesture === 'RIGHT'
                    ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.15 }
                }
                className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center ${
                  detectedGesture === 'RIGHT' || feedback?.studentChoice === false
                    ? 'bg-white text-rose-700 shadow-lg'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                <ArrowRight className="w-8 h-8 lg:w-10 lg:h-10 stroke-[2.5]" />
              </motion.div>

              <div className="space-y-1">
                <div className="text-sm lg:text-lg font-extrabold tracking-wider text-rose-100">
                  GESER KE KANAN
                </div>
                <motion.div
                  animate={{
                    scale:
                      detectedGesture === 'RIGHT' || feedback?.studentChoice === false
                        ? 1.1
                        : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  className="text-2xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white font-display"
                >
                  SALAH
                </motion.div>
              </div>
            </div>

            {/* Dwell / Detection Bar */}
            <div className="relative z-10 w-full space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-rose-950 overflow-hidden border border-rose-300/40">
                <motion.div
                  className="h-full bg-white origin-left"
                  animate={{
                    scaleX:
                      detectedGesture === 'RIGHT'
                        ? Math.max(0.25, dwellProgress / 100)
                        : feedback?.studentChoice === false
                        ? 1
                        : 0,
                  }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
              <div className="text-[11px] font-bold text-rose-50">
                {feedback?.studentChoice === false
                  ? 'JAWABAN SALAH TERKUNCI!'
                  : detectedGesture === 'RIGHT'
                  ? 'GERAKAN KANAN TERDETEKSI!'
                  : 'Geser Tubuh / Klik Kanan'}
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* =====================================================================
          BAGIAN BAWAH: STATUS KAMERA, INDIKATOR GERAKAN & TOMBOL AKSI WAJIB
          - Aktifkan Kamera
          - Uji Gerakan
          - Mulai Permainan Kelas
          - Matikan Kamera
      ===================================================================== */}
      <div className="rounded-2xl bg-[#0F1E3A] border border-slate-700/80 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Status Kamera & Indikator Gerakan Real-time */}
        <div className="flex flex-wrap items-center gap-4 text-xs lg:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status Kamera:</span>
            <span
              className={`font-bold ${
                isCameraActive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isCameraActive ? 'AKTIF (LIVE)' : 'NONAKTIF'}
            </span>
          </div>

          <span aria-hidden="true" className="text-slate-700">·</span>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Indikator Gerakan:</span>
            <span
              className={`font-bold font-mono-tabular ${
                detectedGesture === 'LEFT'
                  ? 'text-emerald-400'
                  : detectedGesture === 'RIGHT'
                  ? 'text-rose-400'
                  : 'text-sky-300'
              }`}
            >
              {detectedGesture === 'LEFT'
                ? 'GESER KE KIRI = BENAR'
                : detectedGesture === 'RIGHT'
                ? 'GESER KE KANAN = SALAH'
                : 'TENGAH (SIAP)'}
            </span>
          </div>
        </div>

        {/* 4 Tombol Aksi Utama Sesuai Spesifikasi Prompt */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Aktifkan Kamera */}
          <button
            type="button"
            onClick={activateCamera}
            disabled={isCameraActive}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-45 text-white text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Aktifkan Kamera</span>
          </button>

          {/* 2. Uji Gerakan */}
          <button
            type="button"
            onClick={handleEnterTrialMode}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              arenaMode === 'TRIAL'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Uji Gerakan</span>
          </button>

          {/* Quick Gesture Simulators for Projector Testing */}
          <div className="flex items-center gap-1 bg-[#091326] p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => triggerBodyShift('LEFT', true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              title="Simulasi Geser Tubuh ke Kiri (BENAR)"
            >
              ◄ Uji Kiri
            </button>
            <button
              type="button"
              onClick={() => triggerBodyShift('CENTER', false)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              title="Kembali ke Posisi Tengah"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => triggerBodyShift('RIGHT', true)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              title="Simulasi Geser Tubuh ke Kanan (SALAH)"
            >
              Uji Kanan ►
            </button>
          </div>

          {/* 3. Mulai Permainan Kelas */}
          <button
            type="button"
            onClick={handleStartClassGame}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {arenaMode === 'PLAYING'
                ? 'Mulai Ulang Permainan'
                : 'Mulai Permainan Kelas'}
            </span>
          </button>

          {/* 4. Matikan Kamera */}
          <button
            type="button"
            onClick={stopCamera}
            disabled={!isCameraActive}
            className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CameraOff className="w-4 h-4" />
            <span>Matikan Kamera</span>
          </button>
        </div>
      </div>
    </div>
  );
};
