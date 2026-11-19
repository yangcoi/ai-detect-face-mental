"use client";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { FatigueAnalyzer } from "../utils/fatigue";

const API = "http://localhost:8000";

interface Props {
  webcamRef: React.RefObject<Webcam>;
  isDevMode?: boolean;
  onScanComplete?: (blob: Blob, averagedEmotions: any, eyeInfo: any) => void;
}

export default function AutoScanner({ webcamRef, isDevMode = false, onScanComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [fps, setFps] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const isRunning = useRef(true);

  // New states for AI improvements
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const fatigueAnalyzer = useRef(new FatigueAnalyzer(15000));
  
  // Session States
  const [sessionStatus, setSessionStatus] = useState<"IDLE" | "RECORDING" | "DONE">("IDLE");
  const [countdown, setCountdown] = useState(15);
  const [finalConcludedState, setFinalConcludedState] = useState<string>("Unknown");
  
  const [concludedState, setConcludedState] = useState<string>("Unknown"); // Realtime state
  const [fatigueMetrics, setFatigueMetrics] = useState<any>({ perclos: 0 });

  // Suppress TFLite INFO logs that go to stderr (console.error) and crash Next.js Dev Overlay
  useEffect(() => {
    const origError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("INFO: Created TensorFlow Lite")) return;
      origError(...args);
    };
    return () => {
      console.error = origError;
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionStatus === "RECORDING" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (sessionStatus === "RECORDING" && countdown === 0) {
      setSessionStatus("DONE");
      setFinalConcludedState(fatigueAnalyzer.current.getConcludedEmotion());
      
      if (onScanComplete) {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
          fetch(imageSrc).then(r => r.blob()).then(blob => {
             const avgEmotions = fatigueAnalyzer.current.getGlobalAveragedEmotions();
             const perclos = fatigueAnalyzer.current.getPerclos();
             const face_quality = fatigueAnalyzer.current.getRegionalFaceQuality();
             
             const eyeInfo = { 
               state: perclos > 40 ? "drowsy" : "open",
               drowsiness_score: perclos,
               blink_rate_per_min: fatigueAnalyzer.current.getBlinkRatePerMin(),
               eyes_detected: perclos > 40 ? 0 : 2,
               eye_boxes: [],
               is_frowning: fatigueAnalyzer.current.getGlobalFrown(),
               is_squinting: fatigueAnalyzer.current.getGlobalSquint(),
               face_quality: face_quality,
               face_quality_low: !face_quality.full_face_visible,
               eye_quality_low: !face_quality.eyes_visible,
               sustained_negative_2s: fatigueAnalyzer.current.getSustainedNegative2s(),
               masked_smile_signal: fatigueAnalyzer.current.getMaskedSmile()
             };
             onScanComplete(blob, avgEmotions, eyeInfo);
          });
        }
      }
    }
    return () => clearTimeout(timer);
  }, [sessionStatus, countdown]);

  // Init MediaPipe
  useEffect(() => {
    async function initMediaPipe() {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const fl = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
        setFaceLandmarker(fl);
        console.log("MediaPipe FaceLandmarker loaded");
      } catch (err) {
        console.error("Failed to load MediaPipe", err);
      }
    }
    initMediaPipe();
  }, []);

  // Loop refs to read current state without stale closures
  const sessionStatusRef = useRef(sessionStatus);
  useEffect(() => { sessionStatusRef.current = sessionStatus; }, [sessionStatus]);

  const isFetching = useRef(false);
  const latestBackendBoxes = useRef<any>(null);
  const latestEmotions = useRef<any>(null);

  useEffect(() => {
    isRunning.current = true;
    let frames = 0;
    let lastTime = performance.now();
    let lastVideoTime = -1;

    const loop = async () => {
      if (!isRunning.current) return;

      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        const frameStart = performance.now();

        // 1. Run MediaPipe on frontend for eye state & frowning
        let ear = 0.3;
        let ced = 0.15;
        let isFrowning = false;
        let faceQuality = false;
        let eyeQuality = false;
        let mpLandmarks = null;
        let blendshapesRecord: Record<string, number> | null = null;

        if (faceLandmarker && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const results = faceLandmarker.detectForVideo(video, performance.now());
            mpLandmarks = results;
            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
              faceQuality = true; // MP sees a face
              eyeQuality = true;  // Assuming if we get blendshapes, we have eyes
              
              const shapes = results.faceBlendshapes[0].categories;
              blendshapesRecord = {};
              shapes.forEach((s: any) => { blendshapesRecord![s.categoryName] = s.score; });

              const getScore = (name: string) => blendshapesRecord![name] || 0;
              
              // 1. EAR (Eye Aspect Ratio) Calculation (Hình học 3D)
              const lm = results.faceLandmarks[0];
              const getDistance = (p1: any, p2: any) => {
                if (!p1 || !p2) return 0;
                // MediaPipe trả về tọa độ normalized (0..1). Phải scale theo aspect ratio của camera!
                // Nếu không scale, video 16:9 sẽ làm móp trục Y, khiến EAR bị tính ra cực kỳ nhỏ!
                const vw = video.videoWidth || 1280;
                const vh = video.videoHeight || 720;
                
                const dx = (p1.x - p2.x) * vw;
                const dy = (p1.y - p2.y) * vh;
                const dz = (p1.z - p2.z) * vw; // z cũng được scale theo width bởi MP
                
                return Math.hypot(dx, dy, dz);
              };
              
              const getEAR = (eye: number[]) => {
                const p0 = lm[eye[0]], p1 = lm[eye[1]], p2 = lm[eye[2]], p3 = lm[eye[3]];
                const width = getDistance(p0, p1);
                const height = getDistance(p2, p3);
                return width > 0 ? (height / width) : 0;
              };
              const earRight = getEAR([33, 133, 159, 145]);
              const earLeft = getEAR([263, 362, 386, 374]);
              ear = (earRight + earLeft) / 2;

              // 2. CED (Cheek-Eye Distance) Calculation
              // Mắt ngoài -> Khóe miệng
              const dRight = getDistance(lm[33], lm[61]);
              const dLeft = getDistance(lm[263], lm[291]);
              ced = (dRight + dLeft) / 2;

              // 3. Frowning (Vẫn dùng blendshape tạm vì chân mày dễ bắt hơn)
              const browDownLeft = getScore("browDownLeft");
              const browDownRight = getScore("browDownRight");
              const browInnerUp = getScore("browInnerUp"); 
              
              isFrowning = ((browDownLeft + browDownRight) / 2 > 0.08) || (browInnerUp > 0.08);
            }
          } catch (err) {
            console.error("MediaPipe detection error:", err);
          }
        }

        // 3. Update Fatigue & Temporal Analyzer at 60 FPS
        if (sessionStatusRef.current === "RECORDING" && mpLandmarks) {
          const backendDetectsFace = latestBackendBoxes.current && latestBackendBoxes.current.length > 0;
          const finalFaceQuality = faceQuality && backendDetectsFace;
          
          fatigueAnalyzer.current.update(
            ear, ced, latestEmotions.current, isFrowning, 
            finalFaceQuality, eyeQuality, true, true, blendshapesRecord
          );
          
          setConcludedState(fatigueAnalyzer.current.getConcludedEmotion());
          setFatigueMetrics({ 
            perclos: fatigueAnalyzer.current.getPerclos(),
            frowning: isFrowning,
            closed: ear < 0.12, // Just for immediate UI feedback
            squinting: ear >= 0.12 && ear < 0.18,
            blink_rate: fatigueAnalyzer.current.getBlinkRatePerMin()
          });
        }

        // Start recording if face is detected and we are IDLE
        if (mpLandmarks && mpLandmarks.faceLandmarks?.length > 0 && sessionStatusRef.current === "IDLE") {
          fatigueAnalyzer.current.reset();
          setCountdown(15);
          setSessionStatus("RECORDING");
        }

        // 2. Send frame to Backend for ViT Emotion detection (NON-BLOCKING)
        let srcX = 0, srcY = 0, srcW = video.videoWidth, srcH = video.videoHeight;
        if (mpLandmarks && mpLandmarks.faceLandmarks && mpLandmarks.faceLandmarks.length > 0) {
          const landmarks = mpLandmarks.faceLandmarks[0];
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const l of landmarks) {
            if (l.x < minX) minX = l.x;
            if (l.y < minY) minY = l.y;
            if (l.x > maxX) maxX = l.x;
            if (l.y > maxY) maxY = l.y;
          }
          const padding = 0.3;
          const w = (maxX - minX);
          const h = (maxY - minY);
          minX = Math.max(0, minX - w * padding);
          minY = Math.max(0, minY - h * padding);
          maxX = Math.min(1, maxX + w * padding);
          maxY = Math.min(1, maxY + h * padding);

          srcX = minX * video.videoWidth;
          srcY = minY * video.videoHeight;
          srcW = (maxX - minX) * video.videoWidth;
          srcH = (maxY - minY) * video.videoHeight;
        }

        // Draw boxes synchronously so Face Mesh is always smooth
        drawBoxes(mpLandmarks, video.videoWidth, video.videoHeight, {x: srcX, y: srcY, w: srcW, h: srcH});

        if (!isFetching.current) {
          const canvas = document.createElement("canvas");
          canvas.width = srcW;
          canvas.height = srcH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
            canvas.toBlob((blob) => {
              if (blob) {
                isFetching.current = true;
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");
                formData.append("is_cropped", "true");
                // Sử dụng kết quả tương đối đã tính toán từ fatigueAnalyzer thay vì ngưỡng cứng tuyệt đối
                const history = fatigueAnalyzer.current["history"];
                const lastH = history.length > 0 ? history[history.length - 1] : { closed: false, squint: false };
                
                const frameEyeInfo = {
                  state: lastH.closed ? "closed" : (lastH.squint ? "drowsy" : "open"),
                  is_squinting: lastH.squint,
                  is_frowning: isFrowning,
                  drowsiness_score: lastH.closed ? 90 : (lastH.squint ? 50 : 10),
                  eyes_detected: 2
                };
                formData.append("eye_info_json", JSON.stringify(frameEyeInfo));
                
                axios.post(`${API}/analyze_face`, formData)
                  .then(res => {
                    if (res.data.success) {
                      setDebugData(res.data);
                      latestBackendBoxes.current = res.data.debug_boxes;
                      latestEmotions.current = res.data.emotions;
                    } else {
                      setDebugData(null);
                      latestBackendBoxes.current = null;
                      latestEmotions.current = null;
                    }
                  })
                  .catch(() => {})
                  .finally(() => {
                    isFetching.current = false;
                  });
              }
            }, "image/jpeg", 0.8);
          }
        }

        setProcessingTime(Math.round(performance.now() - frameStart));
      }

      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }

      if (isRunning.current) {
        requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      isRunning.current = false;
    };
  }, [webcamRef, faceLandmarker]);

  const drawBoxes = (mpLandmarks: any, vWidth: number, vHeight: number, faceBox: {x: number, y: number, w: number, h: number}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = vWidth;
    canvas.height = vHeight;
    ctx.clearRect(0, 0, vWidth, vHeight);

    if (mpLandmarks && mpLandmarks.faceLandmarks && mpLandmarks.faceLandmarks.length > 0) {
      const landmarks = mpLandmarks.faceLandmarks[0];
      
      // 1. Draw Face Mesh (Blue dots)
      ctx.fillStyle = "#89b4fa"; // blue color for mesh
      for (const l of landmarks) {
        ctx.beginPath();
        ctx.arc(l.x * vWidth, l.y * vHeight, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 2. Draw Face Bounding Box (Green)
      ctx.strokeStyle = "#40a02b"; // Light mode green
      ctx.lineWidth = 3;
      ctx.strokeRect(faceBox.x, faceBox.y, faceBox.w, faceBox.h);
      ctx.fillStyle = "#40a02b";
      ctx.font = "bold 16px Inter";
      ctx.fillText("Face", faceBox.x, faceBox.y - 8);

      // 3. Draw Eye Bounding Boxes (Yellow) using precise landmarks
      // Right Eye (User's left): 33 (outer), 133 (inner), 159 (top), 145 (bottom)
      // Left Eye (User's right): 263 (outer), 362 (inner), 386 (top), 374 (bottom)
      const drawEye = (indices: number[], label: string) => {
        let minX = vWidth, minY = vHeight, maxX = 0, maxY = 0;
        for (const idx of indices) {
          const l = landmarks[idx];
          if (!l) continue;
          const x = l.x * vWidth;
          const y = l.y * vHeight;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        // Add a little padding to the eye box
        const pad = 10;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        
        ctx.strokeStyle = "#df8e1d"; // Light mode yellow/orange
        ctx.lineWidth = 2;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.fillStyle = "#df8e1d";
        ctx.font = "bold 14px Inter";
        ctx.fillText(label, minX, minY - 6);
      };

      drawEye([33, 133, 159, 145, 153, 144, 163, 7], "Eye 1");
      drawEye([263, 362, 386, 374, 380, 390, 373, 381], "Eye 2");
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      
      {/* NORMAL MODE UI (Centered Overlay) */}
      {!isDevMode && sessionStatus === "RECORDING" && (
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--bg-secondary)",
          padding: "12px 24px",
          borderRadius: "50px",
          border: "2px solid var(--primary-color)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "var(--text)"
        }}>
          <div className="spinner" style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "3px solid var(--accent)", borderTopColor: "transparent",
            animation: "spin 1s linear infinite"
          }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            Đang phân tích... ({countdown}s)
          </span>
        </div>
      )}

      {/* DEV MODE SIDEBAR */}
      {isDevMode && (
        <div style={{
          position: "fixed",
          top: 80,
          right: 0,
          width: 280,
          height: "calc(100vh - 80px)",
          background: "var(--bg-secondary, #e6e9ef)",
          padding: 16,
          borderRadius: "12px 0 0 12px",
          border: "1px solid var(--border-color, #bcc0cc)",
          color: "var(--text, #4c4f69)",
          fontSize: "0.85rem",
          zIndex: 20,
          overflowY: "auto",
          boxShadow: "-4px 0 8px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          
          <div style={{ background: "rgba(0,0,0,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid #8839ef" }}>
              <div style={{ color: "#cba6f7", fontWeight: "bold", marginBottom: 8, fontSize: "1rem", textAlign: "center" }}>
                {sessionStatus === "IDLE" && "WAITING FOR FACE..."}
                {sessionStatus === "RECORDING" && `ANALYZING... (${countdown}s)`}
                {sessionStatus === "DONE" && "FINAL CONCLUSION"}
              </div>
              
              {sessionStatus === "RECORDING" && (
                <div style={{ fontSize: "1.2rem", fontWeight: "bold", textAlign: "center", color: "#a6e3a1" }}>
                  {concludedState}
                </div>
              )}
              {sessionStatus === "DONE" && (
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", textAlign: "center", color: "#f38ba8" }}>
                  {finalConcludedState}
                </div>
              )}
            </div>

            <div>
              <div style={{ color: "#40a02b", fontWeight: "bold", marginBottom: 8, fontSize: "0.9rem" }}>[RAW] ViT Emotions</div>
              {debugData && Object.entries(debugData.raw_emotions || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([k, v]: any) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ textTransform: "capitalize" }}>{k}</span>
                  <span>{v}%</span>
                </div>
              ))}
              {!debugData && <div style={{ fontSize: "0.8rem", fontStyle: "italic" }}>Đang chờ dữ liệu...</div>}
            </div>
            <div>
              <div style={{ color: "#1e66f5", fontWeight: "bold", marginBottom: 8, fontSize: "0.9rem" }}>[FUSED] Adjusted</div>
              {debugData && Object.entries(debugData.emotions || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([k, v]: any) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ textTransform: "capitalize" }}>{k}</span>
                  <span>{v}%</span>
                </div>
              ))}
              {!debugData && <div style={{ fontSize: "0.8rem", fontStyle: "italic" }}>Đang chờ dữ liệu...</div>}
            </div>

            <div>
              <div style={{ color: "#f9e2af", fontWeight: "bold", marginBottom: 8, fontSize: "0.9rem" }}>Temporal Face / Eyes</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>MP Eye State</span>
                <span style={{ color: fatigueMetrics.closed ? "#eba0ac" : "#a6e3a1" }}>
                  {fatigueMetrics.closed ? "Closed" : "Open"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>PERCLOS (Fatigue)</span>
                <span style={{ color: fatigueMetrics.perclos > 40 ? "#eba0ac" : "#fff" }}>
                  {fatigueMetrics.perclos.toFixed(1)}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>MP Brow State</span>
                <span style={{ color: fatigueMetrics.frowning ? "#fab387" : "#a6e3a1" }}>
                  {fatigueMetrics.frowning ? "Frowning" : "Relaxed"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}>
              <div style={{ color: "#f38ba8", fontWeight: "bold", marginBottom: 8, fontSize: "0.9rem" }}>System Performance</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>FPS</span><span>{fps}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Processing Time</span><span>{processingTime} ms</span>
              </div>
              {!faceLandmarker && (
                <div style={{ color: "#f9e2af", marginTop: 8, fontSize: "0.8rem", fontStyle: "italic" }}>
                  Loading MediaPipe...
                </div>
              )}
              
              {sessionStatus === "DONE" && (
                <button 
                  onClick={() => setSessionStatus("IDLE")}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "8px",
                    background: "#89b4fa",
                    color: "#1e1e2e",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Restart Scan
                </button>
              )}
          </div>
        </div>
      )}
    </>
  );
}
