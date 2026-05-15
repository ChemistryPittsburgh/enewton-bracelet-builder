"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, ContactShadows } from "@react-three/drei";
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
} from "@/lib/constants";

interface SceneProps {
  panelOpen?: boolean;
}

export function Scene({ panelOpen = false }: SceneProps) {
  const controlsRef = useRef<CameraControls>(null);
  return (
    <div className="relative h-full w-full">
      <BeadErrorToast />
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_DEFAULT_POSITION, near: CAMERA_NEAR, far: CAMERA_FAR }}
        gl={{ antialias: true }}
        shadows
        dpr={[1, 2]}
        style={{ background: "#f5f0eb" }}
      >
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
        <CameraOffset panelOpen={panelOpen} panelWidth={PANEL_WIDTH} />
        <CameraControls
          ref={controlsRef}
          minDistance={CAMERA_MIN_DISTANCE}
          maxDistance={CAMERA_MAX_DISTANCE}
        />
      </Canvas>
    </div>
  );
}
