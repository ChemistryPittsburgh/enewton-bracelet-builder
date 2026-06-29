"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraControls, Environment, ContactShadows } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { BraceletCord } from "./BraceletCord";
import { AllBeads } from "./AllBeads";
import { CameraController } from "./CameraController";
import { CameraOffset } from "./CameraOffset";
import { BeadErrorToast } from "./BeadErrorToast";
import { usePanelWidth } from "@/components/ui/Panel";
import {
  CAMERA_FOV,
  CAMERA_DEFAULT_POSITION,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  SCENE_BACKGROUND,
  EDIT_MODE_BACKGROUND,
} from "@/lib/constants";

/** Registers the WebGL renderer, scene, and camera in the Zustand store for thumbnail capture. */
function CanvasRegistrar() {
  const { gl, scene, camera } = useThree();
  const setCanvasEl    = useStore((s) => s.setCanvasEl);
  const setGlRenderer  = useStore((s) => s.setGlRenderer);
  const setThreeScene  = useStore((s) => s.setThreeScene);
  const setThreeCamera = useStore((s) => s.setThreeCamera);
  useEffect(() => {
    setCanvasEl(gl.domElement);
    setGlRenderer(gl);
    setThreeScene(scene);
    setThreeCamera(camera);
    return () => {
      setCanvasEl(null);
      setGlRenderer(null);
      setThreeScene(null);
      setThreeCamera(null);
    };
  }, [gl, scene, camera, setCanvasEl, setGlRenderer, setThreeScene, setThreeCamera]);
  return null;
}

function ControlsRegistrar({ controlsRef }: { controlsRef: React.RefObject<CameraControls> }) {
  const setControlsEl = useStore((s) => s.setControlsEl);
  useEffect(() => {
    // controlsRef.current is set after CameraControls mounts; poll briefly to catch it.
    const id = setInterval(() => {
      if (controlsRef.current) {
        setControlsEl(controlsRef.current);
        clearInterval(id);
      }
    }, 50);
    return () => {
      clearInterval(id);
      setControlsEl(null);
    };
  }, [controlsRef, setControlsEl]);
  return null;
}

interface SceneProps {
  panelOpen?: boolean;
  rightPanelOpen?: boolean;
  isLocked?: boolean;
}

const DRAG_DESELECT_THRESHOLD_SQ = 4 * 4; // squared px; avoids sqrt on every move event

export function Scene({ panelOpen = false, rightPanelOpen = false, isLocked = false }: SceneProps) {
  const panelWidth = usePanelWidth();
  const controlsRef = useRef<CameraControls>(null);
  const { isEditMode, clearSelectedBead, clearEditSelection, viewMode, canvasTool } = useStore(useShallow((s) => ({
    isEditMode: s.isEditMode,
    clearSelectedBead: s.clearSelectedBead,
    clearEditSelection: s.clearEditSelection,
    viewMode: s.viewMode,
    canvasTool: s.canvasTool,
  })));

  const panActive = isEditMode && viewMode !== 'line' && (canvasTool === 'look' || canvasTool === 'pan');

  // Track pointer movement so a canvas drag (pan) doesn't fire deselect on pointer-up
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  return (
    <div
      className={`relative h-full w-full ${panActive ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerDown={(e) => { pointerDownPos.current = { x: e.clientX, y: e.clientY }; didDrag.current = false; }}
      onPointerMove={(e) => {
        if (!pointerDownPos.current) return;
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        if (dx * dx + dy * dy > DRAG_DESELECT_THRESHOLD_SQ) didDrag.current = true;
      }}
      onPointerUp={() => { pointerDownPos.current = null; }}
    >
      <BeadErrorToast />
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_DEFAULT_POSITION, near: CAMERA_NEAR, far: CAMERA_FAR }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl, scene }) => {
          gl.toneMappingExposure = 1.5;
          // Tame the warm apartment reflections so gold reads as champagne, not saturated yellow
          scene.environmentIntensity = 0.5;
        }}
        shadows
        dpr={[1, 1.5]}
        style={{ background: isEditMode ? EDIT_MODE_BACKGROUND : SCENE_BACKGROUND }}
        onPointerMissed={() => {
          if (didDrag.current) return;
          clearSelectedBead();
          clearEditSelection();
        }}
      >
        <CanvasRegistrar />
        <ControlsRegistrar controlsRef={controlsRef} />
        <ambientLight intensity={0.2} color="#fff8f2" />
        <directionalLight position={[0.1, 0.2, 0.1]} intensity={0.8} color="#fffaf6" castShadow={viewMode !== 'line'} />
        <directionalLight position={[-0.3, 0, -0.3]} intensity={0.6} color="#fff5f0"/>
        <directionalLight position={[1.5, 0, -1]} intensity={0.8} color="#fffaf6" />
        <Environment files="/hdri/lebombo_1k.hdr" background={false} resolution={200} blur={0.8} backgroundIntensity={0.1} environmentIntensity={0.45} />

        <Suspense fallback={null}>
          <BraceletCord />
          <AllBeads isLocked={isLocked} />
          <CameraController controlsRef={controlsRef} />
        </Suspense>

        {viewMode !== 'line' && (
          <ContactShadows
            position={[0, -0.045, 0]}
            opacity={0.25}
            scale={0.15}
            blur={1.5}
            far={0.06}
          />
        )}

        <CameraOffset
          leftPanelOpen={panelOpen}
          rightPanelOpen={rightPanelOpen}
          panelWidth={panelWidth}
        />
        <CameraControls
          ref={controlsRef}
          minDistance={CAMERA_MIN_DISTANCE}
          maxDistance={CAMERA_MAX_DISTANCE}
        />
      </Canvas>
    </div>
  );
}