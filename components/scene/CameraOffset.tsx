"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CameraOffsetProps {
  panelOpen: boolean;
  panelWidth: number;
}

export function CameraOffset({ panelOpen, panelWidth }: CameraOffsetProps) {
  const { camera, size } = useThree();

  const anim = useRef({
    current: 0,
    start: 0,
    target: 0,
    startTime: 0,
    running: false,
    duration: 300, // match CSS transition ms
  });

  useEffect(() => {
    const a = anim.current;
    a.start = a.current;
    a.target = panelOpen ? -(panelWidth / 2) : 0;
    a.startTime = performance.now();
    a.running = true;
  }, [panelOpen, panelWidth]);

  useFrame(() => {
    const a = anim.current;
    const cam = camera as THREE.PerspectiveCamera;

    if (a.running) {
      const t = Math.min((performance.now() - a.startTime) / a.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic, matches CSS ease-out
      a.current = a.start + (a.target - a.start) * eased;
      if (t >= 1) { a.current = a.target; a.running = false; }
    }

    // Apply offset every frame so external camera resets don't undo it
    if (Math.abs(a.current) < 0.5) {
      if (cam.view?.enabled) cam.clearViewOffset();
    } else {
      cam.setViewOffset(size.width, size.height, a.current, 0, size.width, size.height);
    }
  });

  return null;
}