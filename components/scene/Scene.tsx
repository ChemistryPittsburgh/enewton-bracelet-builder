"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { BraceletCord } from "./BraceletCord";
import { AllBeads } from "./AllBeads";

export function Scene() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        /**
         * Camera positioned above the bracelet looking down at a slight angle.
         * The bracelet lies flat in the XZ plane at Y=0.
         * Adjust `position` to change the viewing angle:
         *   [0, 0.08, 0.06] = slightly angled above
         *   [0, 0.1, 0]     = straight top-down
         */
        camera={{ fov: 50, position: [0, 0.08, 0.06], near: 0.001, far: 5 }}
        gl={{ antialias: true }}
        shadows
        dpr={[1, 2]}
        style={{ background: "#f5f0eb" }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[0.1, 0.2, 0.1]} intensity={1.0} castShadow />
        <directionalLight position={[-0.1, 0.2, -0.1]} intensity={0.4} />

        {/* Environment map for PBR material reflections */}
        <Environment preset="studio" />

        {/* Scene objects */}
        <Suspense fallback={null}>
          <BraceletCord />
          <AllBeads />
        </Suspense>

        {/* Subtle shadow on the "table" below */}
        <ContactShadows
          position={[0, -0.005, 0]}
          opacity={0.25}
          scale={0.15}
          blur={1}
          far={0.02}
        />

        {/* Camera controls — allow rotating and zooming but not panning */}
        <OrbitControls
          enablePan={false}
          minDistance={0.04}
          maxDistance={0.18}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
