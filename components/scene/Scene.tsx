"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraControls, Environment, ContactShadows } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { BraceletCord } from "./BraceletCord";
import { AllBeads } from "./AllBeads";
import { CameraController } from "./CameraController";
import { CameraOffset } from "./CameraOffset";
import { BeadErrorToast } from "./BeadErrorToast";
import { PANEL_WIDTH } from "@/components/ui/Panel";
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

/** Registers gl.domElement in the Zustand store so hooks outside the Canvas can capture thumbnails. */
function CanvasRegistrar() {
  const gl = useThree((s) => s.gl);
  const setCanvasEl = useStore((s) => s.setCanvasEl);
  useEffect(() => {
    setCanvasEl(gl.domElement);
    return () => setCanvasEl(null);
  }, [gl.domElement, setCanvasEl]);
  return null;
}

function ControlsRegistrar({ controlsRef }: { controlsRef: React.RefObject<CameraControls> }) {
  const setControlsEl = useStore((s) => s.setControlsEl);
  useEffect(() => {
    setControlsEl(controlsRef.current);
    return () => setControlsEl(null);
  }, [controlsRef.current, setControlsEl]);
  return null;
}

interface SceneProps {
  panelOpen?: boolean;
  rightPanelOpen?: boolean;
}

export function Scene({ panelOpen = false, rightPanelOpen = false }: SceneProps) {
  const controlsRef = useRef<CameraControls>(null);
  const { isEditMode, clearSelectedBead, setEditSelectedBead } = useStore((s) => ({
    isEditMode: s.isEditMode,
    clearSelectedBead: s.clearSelectedBead,
    setEditSelectedBead: s.setEditSelectedBead,
  }));
  return (
    <div className="relative h-full w-full">
      <BeadErrorToast />
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_DEFAULT_POSITION, near: CAMERA_NEAR, far: CAMERA_FAR }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        dpr={[1, 2]}
        style={{ background: isEditMode ? EDIT_MODE_BACKGROUND : SCENE_BACKGROUND }}
        onPointerMissed={() => {
          clearSelectedBead();
          setEditSelectedBead(null);
        }}
      >
        <CanvasRegistrar />
        <ControlsRegistrar controlsRef={controlsRef} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[0.1, 0.2, 0.1]} intensity={1.0} castShadow />
        <directionalLight position={[-0.1, 0.2, -0.1]} intensity={0.4} />
        <Environment preset="studio" />

        <Suspense fallback={null}>
          <BraceletCord />
          <AllBeads />
          <CameraController controlsRef={controlsRef} />
        </Suspense>

        <ContactShadows
          position={[0, -0.005, 0]}
          opacity={0.25}
          scale={0.15}
          blur={1}
          far={0.02}
        />
        <CameraOffset
          leftPanelOpen={panelOpen}
          rightPanelOpen={rightPanelOpen}
          panelWidth={PANEL_WIDTH}
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
