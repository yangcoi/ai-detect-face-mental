export class FatigueAnalyzer {
  private history: { 
    time: number; 
    ear: number;
    ced: number;
    closed: boolean; 
    squint: boolean; 
    emotions: any; 
    frown: boolean; 
    faceQuality: boolean; 
    eyeQuality: boolean;
    mouthVisible: boolean;
    eyesVisible: boolean;
    blendshapes: Record<string, number> | null;
  }[] = [];
  
  private windowSizeMs: number;
  private blinkCount: number = 0;
  private wasClosed: boolean = false;
  private startTime: number = 0;
  
  // Baselines
  private restingEAR: number = 0.30;
  private restingCED: number = 0.15;

  constructor(windowSizeMs: number = 15000) { // Changed to 15 seconds
    this.windowSizeMs = windowSizeMs;
    this.startTime = performance.now();
  }

  reset() {
    this.history = [];
    this.blinkCount = 0;
    this.wasClosed = false;
    this.startTime = performance.now();
  }

  update(
    ear: number, ced: number, emotions: any, isFrowning: boolean, 
    faceQuality: boolean, eyeQuality: boolean, mouthVisible: boolean = true, 
    eyesVisible: boolean = true, blendshapes: Record<string, number> | null = null
  ) {
    const now = performance.now();
    
    // Bỏ Moving Average vì nó sẽ "nuốt" mất các cú chớp mắt siêu nhanh (1-2 frames)
    // MediaPipe tracking đã có filter riêng, ta dùng raw EAR để bắt blink.
    let currentEar = ear;

    // 2. Calibration Phase (First 3 seconds)
    const timeElapsed = now - this.startTime;
    if (timeElapsed <= 3000) {
      // 90th percentile for EAR to ignore blinks during calibration
      const ears = this.history.map(h => h.ear).concat([currentEar]).sort((a, b) => a - b);
      if (ears.length > 0) {
        const p90Index = Math.floor(ears.length * 0.90);
        this.restingEAR = ears[Math.min(p90Index, ears.length - 1)];
      }
      
      // Median for CED (Cheek-Eye Distance)
      const ceds = this.history.map(h => h.ced).concat([ced]).sort((a, b) => a - b);
      if (ceds.length > 0) {
        this.restingCED = ceds[Math.floor(ceds.length * 0.50)];
      }
    }

    // Prevent physically impossible baselines from face-away or eyes-closed during start
    // Mắt người bình thường mở to có EAR từ 0.20 - 0.35. Mắt nhỏ có thể 0.15 - 0.20.
    const safeRestingEAR = Math.max(0.12, this.restingEAR);

    // 3. Dynamic Thresholding based on Baseline
    // Với mắt cấu trúc mí lót/nhỏ, khi nhắm EAR không tụt về 0 (thường đọng ở 0.08 - 0.12)
    // Do đó, giảm < 65% so với Resting EAR là đã nhắm (Blink).
    const isClosed = currentEar < (safeRestingEAR * 0.65);
    
    // Giảm < 85% nhưng >= 65% là nheo mắt (Squint).
    const isSquinting = currentEar >= (safeRestingEAR * 0.65) && currentEar < (safeRestingEAR * 0.85);

    this.history.push({ 
      time: now, ear: currentEar, ced, closed: isClosed, squint: isSquinting, emotions, 
      frown: isFrowning, faceQuality, eyeQuality, mouthVisible, eyesVisible, blendshapes 
    });

    // Blink detection: transition from closed -> open
    if (this.wasClosed && !isClosed) {
      this.blinkCount++;
    }
    this.wasClosed = isClosed;

    // Remove old entries outside the time window
    while (this.history.length > 0 && now - this.history[0].time > this.windowSizeMs) {
      this.history.shift();
      // We don't strictly decrement blinkCount here for simplicity, 
      // but to be precise, we could track blink timestamps.
      // Since it resets every 15s check-in anyway, it's fine.
    }
  }

  getBlinkRatePerMin(): number {
    // We track over a 15s window, so we multiply by 4 to get blinks per minute
    return this.blinkCount * 4;
  }

  getPerclos(): number {
    if (this.history.length === 0) return 0;
    // Only count PERCLOS if eye tracking quality is good
    const validEyeFrames = this.history.filter(h => h.eyeQuality);
    if (validEyeFrames.length === 0) return 0;
    
    const closedCount = validEyeFrames.filter(h => h.closed).length;
    return (closedCount / validEyeFrames.length) * 100;
  }

  getSmoothedEmotions(): Record<string, number> | null {
    if (this.history.length === 0) return null;
    const sums: Record<string, number> = {};
    let count = 0;
    
    // Calculate average for a shorter window to make it responsive (e.g. last 3 seconds)
    const now = performance.now();
    const recentHistory = this.history.filter(h => now - h.time <= 3000);
    
    recentHistory.forEach(h => {
      if (h.emotions) {
        Object.entries(h.emotions).forEach(([k, v]) => {
          sums[k] = (sums[k] || 0) + (v as number);
        });
        count++;
      }
    });

    if (count === 0) return null;
    const smoothed: Record<string, number> = {};
    Object.keys(sums).forEach(k => {
      smoothed[k] = Math.round(sums[k] / count);
    });
    return smoothed;
  }

  getGlobalAveragedEmotions(): Record<string, number> | null {
    if (this.history.length === 0) return null;
    const sums: Record<string, number> = {};
    const peaks: Record<string, number> = {};
    let count = 0;
    
    const validFaceFrames = this.history.filter(h => h.faceQuality);
    
    validFaceFrames.forEach(h => {
      if (h.emotions) {
        Object.entries(h.emotions).forEach(([k, v]) => {
          const val = v as number;
          sums[k] = (sums[k] || 0) + val;
          peaks[k] = Math.max(peaks[k] || 0, val);
        });
        count++;
      }
    });

    if (count === 0) return null;
    
    const result: Record<string, any> = {};
    Object.keys(sums).forEach(k => {
      result[`avg_${k}`] = Math.round(sums[k] / count);
      result[`peak_${k}`] = peaks[k];
      result[k] = Math.round(sums[k] / count); // Keep backwards comp
    });
    
    // Calculate average blendshapes
    const bsSums: Record<string, number> = {};
    let bsCount = 0;
    validFaceFrames.forEach(h => {
      if (h.blendshapes) {
        Object.entries(h.blendshapes).forEach(([k, v]) => {
          bsSums[k] = (bsSums[k] || 0) + v;
        });
        bsCount++;
      }
    });

    if (bsCount > 0) {
      const avgBlendshapes: Record<string, number> = {};
      Object.keys(bsSums).forEach(k => {
        avgBlendshapes[k] = bsSums[k] / bsCount;
      });
      result['blendshapes'] = avgBlendshapes;
    }

    return result;
  }

  getSmoothedFrown(): boolean {
    if (this.history.length === 0) return false;
    // Frown smoothing over last 2 seconds
    const now = performance.now();
    const recentHistory = this.history.filter(h => now - h.time <= 2000);
    if (recentHistory.length === 0) return false;
    
    const frownCount = recentHistory.filter(h => h.frown).length;
    return frownCount / recentHistory.length >= 0.4; // 40% threshold
  }

  getGlobalFrown(): boolean {
    if (this.history.length === 0) return false;
    const validFaceFrames = this.history.filter(h => h.faceQuality);
    if (validFaceFrames.length === 0) return false;
    const frownCount = validFaceFrames.filter(h => h.frown).length;
    return (frownCount / validFaceFrames.length) > 0.15; // If frowning >15% of the 15s window
  }

  getGlobalSquint(): boolean {
    if (this.history.length === 0) return false;
    const validEyeFrames = this.history.filter(h => h.eyeQuality);
    if (validEyeFrames.length === 0) return false;
    const squintCount = validEyeFrames.filter(h => h.squint).length;
    return (squintCount / validEyeFrames.length) > 0.15; // If squinting >15%
  }

  getRegionalFaceQuality(): { mouth_visible: boolean, eyes_visible: boolean, full_face_visible: boolean } {
    if (this.history.length === 0) return { mouth_visible: false, eyes_visible: false, full_face_visible: false };
    
    const goodMouth = this.history.filter(h => h.mouthVisible).length;
    const goodEyes = this.history.filter(h => h.eyesVisible).length;
    
    const mouth_visible = (goodMouth / this.history.length) > 0.6;
    const eyes_visible = (goodEyes / this.history.length) > 0.6;
    
    return {
      mouth_visible,
      eyes_visible,
      full_face_visible: mouth_visible && eyes_visible
    };
  }

  getMaskedSmile(): boolean {
    if (this.history.length === 0) return false;
    
    // Check if the dominant emotion recently is happy
    const smoothed = this.getSmoothedEmotions();
    if (!smoothed || smoothed.happy < 40) return false;

    // A genuine Duchenne smile dramatically decreases CED (Cheek raises towards eyes)
    // If CED is NOT significantly smaller than RestingCED during a "happy" expression -> Fake smile
    
    const now = performance.now();
    const recentHistory = this.history.filter(h => now - h.time <= 2000 && h.faceQuality);
    if (recentHistory.length === 0) return false;
    
    // Calculate average CED in the last 2 seconds (while they are supposedly smiling)
    const avgCED = recentHistory.reduce((sum, h) => sum + h.ced, 0) / recentHistory.length;
    
    // If CED didn't drop by at least 15% from resting state, cheeks didn't rise!
    if (avgCED > this.restingCED * 0.85) {
      return true; // Masked (fake) smile detected!
    }
    
    return false;
  }

  // Backwards comp
  getFaceQualityLow(): boolean {
    return !this.getRegionalFaceQuality().full_face_visible;
  }

  getEyeQualityLow(): boolean {
    return !this.getRegionalFaceQuality().eyes_visible;
  }

  getSustainedNegative2s(): boolean {
    if (this.history.length === 0) return false;
    let consecutiveNegativeFrames = 0;
    const TARGET_CONSECUTIVE_FRAMES = 60; // 2s at 30fps (or close enough depending on tick rate)
    
    for (const h of this.history) {
      if (!h.faceQuality || !h.emotions) {
        consecutiveNegativeFrames = 0;
        continue;
      }
      const saf = (h.emotions.sad || 0) + (h.emotions.angry || 0) + (h.emotions.fear || 0);
      const isSquint = h.squint;
      const neg_score = isSquint ? 
                        (saf / 3.0) : 
                        (saf / 3.0 * 0.8 + (h.emotions.disgust || 0) * 0.2); // Rough approx for streaming
      
      if (neg_score >= 70) {
        consecutiveNegativeFrames++;
        if (consecutiveNegativeFrames >= TARGET_CONSECUTIVE_FRAMES) return true;
      } else {
        consecutiveNegativeFrames = 0;
      }
    }
    return false;
  }

  getConcludedEmotion(): string {
    const smoothed = this.getSmoothedEmotions();
    if (!smoothed) return "Unknown";

    const isFrowning = this.getSmoothedFrown();
    const perclos = this.getPerclos();

    // 1. First priority: Fatigue / Drowsiness
    if (perclos > 40) return "Sleepy / Fatigued";
    
    // Sort emotions by score
    const sorted = Object.entries(smoothed).sort((a, b) => b[1] - a[1]);
    const topEmotion = sorted[0][0];

    // 2. Second priority: Frowning
    if (isFrowning) {
      if (topEmotion === "angry" || topEmotion === "sad" || topEmotion === "disgust") {
        return "Stressed (Frowning)";
      }
      if (topEmotion === "neutral") {
        return "Concentrating (Frowning)";
      }
      return "Frowning";
    }

    // 3. Fallback to top smoothed emotion
    return topEmotion.charAt(0).toUpperCase() + topEmotion.slice(1);
  }
}
