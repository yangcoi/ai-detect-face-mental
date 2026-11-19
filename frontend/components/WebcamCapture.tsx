"use client";
import React, { useRef, useCallback } from "react";
import Webcam from "react-webcam";

interface Props {
  onCapture: (blob: Blob) => void;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export default function WebcamCapture({ onCapture }: Props) {
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    const res = await fetch(imageSrc);
    const blob = await res.blob();
    onCapture(blob);
  }, [onCapture]);

  return (
    <div className="webcam-wrapper">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="webcam-video"
      />
      <button onClick={capture} className="btn-capture">
        📸 Chụp ảnh Check-in
      </button>
    </div>
  );
}
