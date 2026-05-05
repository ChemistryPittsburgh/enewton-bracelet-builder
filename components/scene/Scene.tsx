"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, ContactShadows } from "@react-three/drei";
import { BraceletCord } from "./BraceletCord";
import { AllBeads } from "./AllBeads";
import { CameraController } from "./CameraController"; 


export function Scene() {
  const controlsRef = useRef<CameraControls>(null);
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ fov: 50, position: [0, 0.08, 0.06], near: 0.001, far: 5 }}
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

        <CameraControls
          ref={controlsRef}
          minDistance={0.04}
          maxDistance={0.18}
        />
      </Canvas>
    </div>
  );
}
