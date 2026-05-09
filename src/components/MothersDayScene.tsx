import { Suspense, useMemo, useRef, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Text3D,
  Center,
  Environment,
  ScrollControls,
  useScroll,
  Image as DreiImage,
  Sparkles,
  Cloud,
  Clouds,
  Instances,
  Instance,
  Sky,
  ContactShadows,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  DepthOfField,
  BrightnessContrast,
  HueSaturation,
} from "@react-three/postprocessing";
import * as THREE from "three";

const PETAL_COLORS = [
  "#f4a3b8", "#f7c6d9", "#ffb3a7", "#ffd9b8",
  "#fff1a8", "#e0c3fc", "#d6a4ff", "#ffffff",
];

// ---------- Floating petals (instanced) ----------
function FallingPetals() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const arr: { p: THREE.Vector3; r: number; rs: number; sp: number; col: THREE.Color }[] = [];
    for (let i = 0; i < 140; i++) {
      arr.push({
        p: new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          Math.random() * 12 + 2,
          -Math.random() * 70,
        ),
        r: Math.random() * Math.PI,
        rs: (Math.random() - 0.5) * 0.6,
        sp: 0.2 + Math.random() * 0.4,
        col: new THREE.Color(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]),
      });
    }
    return arr;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;
    data.forEach((d, i) => {
      ref.current!.setColorAt(i, d.col);
    });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    data.forEach((d, i) => {
      d.p.y -= d.sp * 0.02;
      d.p.x += Math.sin(t * 0.6 + i) * 0.005;
      if (d.p.y < -0.4) d.p.y = 12 + Math.random() * 4;
      d.r += d.rs * 0.02;
      dummy.position.copy(d.p);
      dummy.rotation.set(d.r, d.r * 0.7, d.r * 0.5);
      dummy.scale.setScalar(0.06);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <planeGeometry args={[1, 1.6]} />
      <meshStandardMaterial
        side={THREE.DoubleSide}
        roughness={0.7}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ---------- Glowing lanterns ----------
function Lanterns() {
  const lanterns = useMemo(() => {
    const arr: { p: [number, number, number]; phase: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const [x, , z] = pathPoint(t);
      const side = i % 2 === 0 ? 1 : -1;
      arr.push({
        p: [x + side * (3 + Math.random() * 2), 3 + Math.random() * 2.5, z + (Math.random() - 0.5) * 4],
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {lanterns.map((l, i) => (
        <Float key={i} speed={1.1} floatIntensity={0.6} rotationIntensity={0.2}>
          <mesh position={l.p}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial
              color="#ffe7a8"
              emissive="#ffb84d"
              emissiveIntensity={2.2}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={l.p}
            color="#ffc97a"
            intensity={1.2}
            distance={4}
            decay={2}
          />
        </Float>
      ))}
    </group>
  );
}

// ---------- Path ----------
function pathPoint(t: number): [number, number, number] {
  const z = -t * 70;
  const x = Math.sin(t * Math.PI * 2.2) * 3.2;
  const y = -0.5 + Math.sin(t * Math.PI * 4) * 0.15;
  return [x, y, z];
}

// ---------- Tulip flower ----------
function buildPetalGeometry() {
  // teardrop-ish petal via lathe
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = t * 0.45;
    const r = Math.sin(t * Math.PI) * 0.18 + 0.01;
    points.push(new THREE.Vector2(r, y));
  }
  const g = new THREE.LatheGeometry(points, 16, 0, Math.PI * 0.55);
  g.translate(0, -0.05, 0);
  return g;
}

function Tulip({
  position,
  rotationY,
  color,
  bloomAt,
  scrollRef,
  scale = 1,
}: {
  position: [number, number, number];
  rotationY: number;
  color: string;
  bloomAt: number;
  scrollRef: { current: number };
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const petalGeo = useMemo(buildPetalGeometry, []);

  useFrame((state) => {
    if (!group.current || !head.current) return;
    const s = scrollRef.current;
    const t = THREE.MathUtils.clamp((s - bloomAt + 0.1) / 0.18, 0, 1);
    const eased = t * t * (3 - 2 * t);
    const final = scale * eased + 0.0001;
    group.current.scale.setScalar(final);
    const sway = Math.sin(state.clock.elapsedTime * 1.1 + position[0] * 2) * 0.04;
    head.current.rotation.z = sway;
    group.current.rotation.z = sway * 0.5;
  });

  const petalCount = 5;

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      {/* stem */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.028, 1.1, 6]} />
        <meshStandardMaterial color="#5e8c4a" roughness={0.85} />
      </mesh>
      {/* leaf */}
      <mesh position={[0.14, 0.4, 0]} rotation={[0, 0, -0.8]} castShadow>
        <coneGeometry args={[0.08, 0.5, 5]} />
        <meshStandardMaterial color="#6fa75a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 0.55, 0]} rotation={[0, 0, 0.9]} castShadow>
        <coneGeometry args={[0.07, 0.42, 5]} />
        <meshStandardMaterial color="#6fa75a" roughness={0.9} />
      </mesh>
      {/* head */}
      <group ref={head} position={[0, 1.1, 0]}>
        {Array.from({ length: petalCount }).map((_, i) => {
          const a = (i / petalCount) * Math.PI * 2;
          return (
            <mesh
              key={i}
              geometry={petalGeo}
              position={[Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04]}
              rotation={[Math.PI, a, 0.15]}
              castShadow
            >
              <meshStandardMaterial
                color={color}
                roughness={0.55}
                metalness={0.02}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ---------- Daisy ----------
function Daisy({
  position,
  rotationY,
  color,
  bloomAt,
  scrollRef,
  scale = 1,
}: {
  position: [number, number, number];
  rotationY: number;
  color: string;
  bloomAt: number;
  scrollRef: { current: number };
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !head.current) return;
    const s = scrollRef.current;
    const t = THREE.MathUtils.clamp((s - bloomAt + 0.1) / 0.18, 0, 1);
    const eased = t * t * (3 - 2 * t);
    group.current.scale.setScalar(scale * eased + 0.0001);
    head.current.rotation.y = state.clock.elapsedTime * 0.2;
    head.current.rotation.z =
      Math.sin(state.clock.elapsedTime + position[0]) * 0.08;
  });

  const petals = 10;

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.022, 0.8, 6]} />
        <meshStandardMaterial color="#5e8c4a" roughness={0.85} />
      </mesh>
      <group ref={head} position={[0, 0.85, 0]} rotation={[Math.PI / 2.6, 0, 0]}>
        {Array.from({ length: petals }).map((_, i) => {
          const a = (i / petals) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13]}
              rotation={[0, -a, 0]}
              castShadow
            >
              <boxGeometry args={[0.18, 0.012, 0.07]} />
              <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#f6c659" roughness={0.6} emissive="#a8740e" emissiveIntensity={0.15} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Garden ----------
function Garden({ scrollRef }: { scrollRef: { current: number } }) {
  const flowers = useMemo(() => {
    const arr: {
      kind: "tulip" | "daisy";
      pos: [number, number, number];
      color: string;
      bloomAt: number;
      ry: number;
      scale: number;
    }[] = [];
    const N = 90;
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const [px, py, pz] = pathPoint(t);
      // 1-3 flowers per band
      const count = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < count; k++) {
        const side = rnd() > 0.5 ? 1 : -1;
        const off = 1.4 + rnd() * 3.2;
        const jitter = (rnd() - 0.5) * 1.5;
        arr.push({
          kind: rnd() > 0.45 ? "tulip" : "daisy",
          pos: [px + side * off, py, pz + jitter],
          color: PETAL_COLORS[Math.floor(rnd() * PETAL_COLORS.length)],
          bloomAt: t,
          ry: rnd() * Math.PI * 2,
          scale: 0.7 + rnd() * 0.7,
        });
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {flowers.map((f, i) =>
        f.kind === "tulip" ? (
          <Tulip
            key={i}
            position={f.pos}
            rotationY={f.ry}
            color={f.color}
            bloomAt={f.bloomAt}
            scrollRef={scrollRef}
            scale={f.scale}
          />
        ) : (
          <Daisy
            key={i}
            position={f.pos}
            rotationY={f.ry}
            color={f.color}
            bloomAt={f.bloomAt}
            scrollRef={scrollRef}
            scale={f.scale}
          />
        ),
      )}
    </group>
  );
}

// ---------- Grass blades (instanced) ----------
function Grass() {
  const positions = useMemo(() => {
    const arr: { p: [number, number, number]; ry: number; s: number }[] = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1200; i++) {
      const t = rnd();
      const [px, py, pz] = pathPoint(t);
      const side = rnd() > 0.5 ? 1 : -1;
      const off = 0.9 + rnd() * 8;
      const jitter = (rnd() - 0.5) * 4;
      const x = px + side * off;
      const z = pz + jitter;
      arr.push({
        p: [x, py - 0.45, z],
        ry: rnd() * Math.PI,
        s: 0.6 + rnd() * 0.9,
      });
    }
    return arr;
  }, []);

  return (
    <Instances limit={1500} castShadow={false} receiveShadow>
      <coneGeometry args={[0.025, 0.35, 4]} />
      <meshStandardMaterial color="#7ab36b" roughness={0.95} />
      {positions.map((g, i) => (
        <Instance key={i} position={g.p} rotation={[0, g.ry, 0]} scale={[g.s, g.s * 1.3, g.s]} />
      ))}
    </Instances>
  );
}

// ---------- Path stones ----------
function Stones() {
  const stones = useMemo(() => {
    const arr: { p: [number, number, number]; ry: number; s: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const [x, y, z] = pathPoint(t);
      arr.push({ p: [x, y - 0.48, z], ry: Math.random() * Math.PI, s: 0.5 + Math.random() * 0.3 });
    }
    return arr;
  }, []);
  return (
    <Instances limit={50} receiveShadow>
      <sphereGeometry args={[0.5, 10, 6]} />
      <meshStandardMaterial color="#d6cdbf" roughness={1} />
      {stones.map((s, i) => (
        <Instance key={i} position={s.p} rotation={[0, s.ry, 0]} scale={[s.s * 1.2, s.s * 0.35, s.s]} />
      ))}
    </Instances>
  );
}

// ---------- Distant trees ----------
function Trees() {
  const trees = useMemo(() => {
    const arr: { p: [number, number, number]; s: number; c: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const [px, , pz] = pathPoint(t);
      const side = i % 2 === 0 ? 1 : -1;
      arr.push({
        p: [px + side * (10 + Math.random() * 6), -0.5, pz + (Math.random() - 0.5) * 6],
        s: 1.4 + Math.random() * 1.8,
        c: ["#9bbf86", "#aacf95", "#88b176"][i % 3],
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={t.p}>
          <mesh position={[0, t.s * 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, t.s * 1.2, 6]} />
            <meshStandardMaterial color="#6e4f3a" roughness={1} />
          </mesh>
          <mesh position={[0, t.s * 1.6, 0]} castShadow>
            <sphereGeometry args={[t.s * 0.85, 12, 10]} />
            <meshStandardMaterial color={t.c} roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Bumpy ground ----------
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 80, 80);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.15) * 0.25 +
        Math.cos(y * 0.18) * 0.25 +
        Math.sin((x + y) * 0.4) * 0.05;
      pos.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, -30]} receiveShadow>
      <meshStandardMaterial color="#9ec585" roughness={1} />
    </mesh>
  );
}

// ---------- Error boundary for images ----------
class ImageErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

// ---------- Photo frame ----------
function PhotoFrame({
  position,
  rotation = [0, 0, 0],
  url,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  url: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y =
      rotation[1] + Math.sin(s.clock.elapsedTime * 0.5 + position[0]) * 0.12;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[1.7, 2.2, 0.06]} />
        <meshStandardMaterial color="#d9b673" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[1.45, 1.95]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <ImageErrorBoundary>
        <Suspense fallback={null}>
          <DreiImage url={url} position={[0, 0, 0.02]} scale={[1.4, 1.9]} />
        </Suspense>
      </ImageErrorBoundary>
    </group>
  );
}

// ---------- Gold title ----------
function GoldTitle() {
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
      <Center>
        <Text3D
          font="https://threejs.org/examples/fonts/gentilis_bold.typeface.json"
          size={0.7}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.04}
          bevelSize={0.025}
          bevelSegments={6}
        >
          Happy Mother's Day
          <meshStandardMaterial
            color="#f6d27a"
            metalness={1}
            roughness={0.18}
            emissive="#7a5b1a"
            emissiveIntensity={0.18}
          />
        </Text3D>
      </Center>
    </Float>
  );
}

// ---------- End-of-scroll cute message ----------
function EndMessage({ scrollRef }: { scrollRef: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);

  // Position at the very end of the path
  const [px, py, pz] = pathPoint(1);

  useFrame((state) => {
    if (!group.current) return;
    const s = scrollRef.current;
    // appears from scroll 0.7 onwards so it's fully visible at the end
    const t = THREE.MathUtils.clamp((s - 0.7) / 0.25, 0, 1);
    const eased = t * t * (3 - 2 * t);
    group.current.scale.setScalar(0.001 + eased * 1.2);
    (group.current.children[0] as THREE.Object3D).position.y =
      Math.sin(state.clock.elapsedTime * 1.2) * 0.08;
    if (heart.current) {
      const beat = 1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.15;
      heart.current.scale.setScalar(beat);
    }
  });

  return (
    <group ref={group} position={[0, py + 3.2, pz + 4]}>
      <pointLight intensity={2} distance={10} color="#ff7aa8" />
      <group>
        <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.6}>
          <Center>
            <Text3D
              font="https://threejs.org/examples/fonts/gentilis_bold.typeface.json"
              size={0.55}
              height={0.16}
              curveSegments={12}
              bevelEnabled
              bevelThickness={0.03}
              bevelSize={0.02}
              bevelSegments={5}
            >
              I love you, Mom
              <meshStandardMaterial
                color="#ffb3c6"
                metalness={0.4}
                roughness={0.2}
                emissive="#ff0040"
                emissiveIntensity={2.0}
                toneMapped={false}
              />
            </Text3D>
          </Center>
        </Float>

        {/* subtitle */}
        <Float speed={1.2} floatIntensity={0.4} rotationIntensity={0.15}>
          <Center position={[0, -0.9, 0]}>
            <Text3D
              font="https://threejs.org/examples/fonts/gentilis_bold.typeface.json"
              size={0.22}
              height={0.05}
              curveSegments={8}
              bevelEnabled
              bevelThickness={0.012}
              bevelSize={0.008}
              bevelSegments={3}
            >
              Thank you for everything
              <meshStandardMaterial
                color="#f6d27a"
                metalness={1}
                roughness={0.15}
                emissive="#ffaa00"
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </Text3D>
          </Center>
        </Float>

        {/* beating heart */}
        <mesh ref={heart} position={[0, -1.7, 0]} rotation={[Math.PI, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial
            color="#ff5c8a"
            emissive="#ff2e6a"
            emissiveIntensity={1.4}
            roughness={0.3}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>

        <Sparkles count={50} scale={[6, 3, 2]} size={3} speed={0.5} color="#ffd6e2" />
      </group>
    </group>
  );
}

// ---------- Camera driver ----------
function ScrollCamera({
  scrollRef,
  parallaxRef,
}: {
  scrollRef: { current: number };
  parallaxRef: { current: { x: number; y: number } };
}) {
  const scroll = useScroll();
  useFrame((state) => {
    scrollRef.current = scroll.offset;
    const t = scroll.offset;
    const [x, y, z] = pathPoint(t);
    const p = parallaxRef.current;
    const target = new THREE.Vector3(
      x + p.x * 0.7,
      y + 2.3 + p.y * 0.35,
      z + 6,
    );
    state.camera.position.lerp(target, 0.08);
    const lookAhead = pathPoint(Math.min(t + 0.05, 1));
    state.camera.lookAt(lookAhead[0], lookAhead[1] + 1.2, lookAhead[2]);
  });
  return null;
}

function SceneContent({
  scrollRef,
  parallaxRef,
  photos,
}: {
  scrollRef: { current: number };
  parallaxRef: { current: { x: number; y: number } };
  photos: string[];
}) {
  return (
    <>
      <ScrollCamera scrollRef={scrollRef} parallaxRef={parallaxRef} />

      <hemisphereLight args={["#ffe6f0", "#a4c08c", 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.4}
        color="#fff2d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#ffc6dc" />

      <Sky
        sunPosition={[8, 4, 6]}
        turbidity={6}
        rayleigh={2}
        mieCoefficient={0.01}
        mieDirectionalG={0.85}
        inclination={0.49}
        azimuth={0.25}
      />

      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={20} bounds={[8, 2, 4]} volume={6} color="#ffffff" position={[0, 7, -10]} />
        <Cloud seed={2} segments={20} bounds={[10, 2, 4]} volume={6} color="#ffe6ef" position={[6, 8, -28]} />
        <Cloud seed={3} segments={20} bounds={[10, 2, 4]} volume={6} color="#e8e0ff" position={[-6, 8, -45]} />
      </Clouds>

      <Sparkles count={120} scale={[24, 6, 70]} size={2} speed={0.3} color="#fff2c8" position={[0, 2, -30]} />

      <Ground />
      <Stones />
      <Grass />
      <Trees />
      <Garden scrollRef={scrollRef} />
      <Lanterns />
      <FallingPetals />
      <ContactShadows position={[0, -0.45, -30]} opacity={0.35} scale={80} blur={2.5} far={6} />

      <group position={[0, 2.4, -2]}>
        <GoldTitle />
      </group>

      <EndMessage scrollRef={scrollRef} />

      {photos.map((url, i) => {
        const t = (i + 1) / (photos.length + 1);
        const [x, y, z] = pathPoint(t);
        const side = i % 2 === 0 ? 1 : -1;
        return (
          <Float key={i} speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
            <PhotoFrame
              position={[x + side * 2.8, y + 2.6, z]}
              rotation={[0, -side * 0.4, 0]}
              url={url}
            />
          </Float>
        );
      })}
    </>
  );
}

export default function MothersDayScene({ photos }: { photos: string[] }) {
  const scrollRef = useRef(0);
  // ref instead of state -> no React re-render on every move
  const parallaxRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  // Smooth follow loop (works for both pointer + orientation inputs)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      parallaxRef.current.x += (targetRef.current.x - parallaxRef.current.x) * 0.08;
      parallaxRef.current.y += (targetRef.current.y - parallaxRef.current.y) * 0.08;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer handles BOTH mouse and touch
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      targetRef.current = { x, y };
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  // Device-orientation tilt for phones (when user isn't actively touching)
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      // gamma: left/right [-90..90], beta: front/back [-180..180]
      const x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      const y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
      targetRef.current = { x, y: -y };
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 2, 6], fov: 55 }}
      gl={{ antialias: true }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#fde6ee"]} />
      <fog attach="fog" args={["#fad8e4", 18, 90]} />
      <Suspense fallback={null}>
        <Environment preset="sunset" />
        <ScrollControls pages={5} damping={0.1}>
          <SceneContent
            scrollRef={scrollRef}
            parallaxRef={parallaxRef}
            photos={photos}
          />
        </ScrollControls>
        <EffectComposer enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={0.9}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.25}
          />
          <DepthOfField focusDistance={0.012} focalLength={0.04} bokehScale={2.2} />
          <HueSaturation saturation={0.15} />
          <BrightnessContrast brightness={0.02} contrast={0.08} />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}