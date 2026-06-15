"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CameraOffsetProps {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  panelWidth: number;
}

/**
 * Smoothly shifts the camera's view offset so the bracelet stays centred in
 * the visible canvas area when either the left (bead selector) or right (user)
 * panel is open.
 *
 * Left panel open  → shift scene left  by panelWidth/2 (negative X offset)
 * Right panel open → shift scene right by panelWidth/2 (positive X offset)
 * Both open        → offsets cancel out (net 0)
 */
export function CameraOffset({ leftPanelOpen, rightPanelOpen, panelWidth }: CameraOffsetProps) {
  const { camera, size } = useThree();

  const anim = useRef({
    current: 0,
    start: 0,
    target: 0,
    startTime: 0,
    running: false,
    duration: 300, // match CSS transition ms
    lastApplied: NaN, // NaN forces first-frame apply
  });

  useEffect(() => {
    const a = anim.current;
    a.start = a.current;
    a.target =
      (rightPanelOpen ? panelWidth / 2 : 0) -
      (leftPanelOpen  ? panelWidth / 2 : 0);
    a.startTime = performance.now();
    a.running = true;
  }, [leftPanelOpen, rightPanelOpen, panelWidth]);

  useFrame(() => {
    const a = anim.current;
    const cam = camera as THREE.PerspectiveCamera;

    if (a.running) {
      const t = Math.min((performance.now() - a.startTime) / a.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic, matches CSS ease-out
      a.current = a.start + (a.target - a.start) * eased;
      if (t >= 1) { a.current = a.target; a.running = false; }
    }

    // Skip the GPU call when nothing has changed
    if (a.current === a.lastApplied) return;
    a.lastApplied = a.current;

    if (Math.abs(a.current) < 0.5) {
      if (cam.view?.enabled) cam.clearViewOffset();
    } else {
      cam.setViewOffset(size.width, size.height, a.current, 0, size.width, size.height);
    }
  });

  return null;
}
