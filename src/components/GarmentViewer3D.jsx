import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Center, useGLTF, Html } from "@react-three/drei";

const COLOUR_MAP = {
  Black: "#222321",
  "Navy Blue": "#233650",
  Brown: "#765b43",
  "Light Grey": "#b9b9b4",
  White: "#f5f2e9",
  Ivory: "#e6dec9",
  Beige: "#c9b89d",
};

function GarmentModel({ url, colour }) {
  const { scene, materials } = useGLTF(url);
  const ref = useRef();

  useEffect(() => {
    if (!materials) return;
    const hex = COLOUR_MAP[colour] || "#233650";
    Object.values(materials).forEach((mat) => {
      if (mat.name?.toLowerCase().includes("fabric") || mat.name?.toLowerCase().includes("cloth") || mat.name?.toLowerCase().includes("suit")) {
        mat.color.set(hex);
        mat.needsUpdate = true;
      }
    });
  }, [colour, materials]);

  useFrame((_, delta) => {
    if (ref.current && !ref.current.userData.touched) {
      ref.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Center>
      <primitive
        ref={ref}
        object={scene}
        scale={2.2}
        onPointerDown={() => { if (ref.current) ref.current.userData.touched = true; }}
      />
    </Center>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="viewer3d-loading">
        <div className="viewer3d-spinner" />
        <span>Loading 3D model...</span>
      </div>
    </Html>
  );
}

export function GarmentViewer3D({ modelUrl, colour = "Navy Blue", className = "" }) {
  const [error, setError] = useState(false);

  if (!modelUrl || error) {
    return (
      <div className={`viewer3d-placeholder ${className}`}>
        <div className="viewer3d-placeholder-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
          <h4>360° View Coming Soon</h4>
          <p>Interactive 3D garment preview will be available when the model asset is uploaded by the administrator.</p>
          <span className="eyebrow">Drag to rotate · Scroll to zoom</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`viewer3d-container ${className}`}>
      <Canvas
        camera={{ position: [0, 1, 4], fov: 40 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => { gl.setClearColor("#0b1423", 1); }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />
        <Suspense fallback={<LoadingFallback />}>
          <GarmentModel url={modelUrl} colour={colour} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.5}
          enableDamping
        />
      </Canvas>
      <div className="viewer3d-controls-hint">
        <span>🖱 Drag to rotate</span>
        <span>🔍 Scroll to zoom</span>
        <span>📱 Pinch to zoom on mobile</span>
      </div>
    </div>
  );
}
