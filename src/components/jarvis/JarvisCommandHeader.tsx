import React, { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Activity, Cpu, Database, ShieldCheck, Zap } from 'lucide-react';
import type { AdminStats } from '../../types';
import type { MaintenanceStatus } from '../../services/api';

type Props = {
  adminName?: string;
  stats: AdminStats | null;
  firebaseConnected: boolean | null;
  maintenance: MaintenanceStatus | null;
  loading: boolean;
};

function ReactorCore() {
  const core = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (core.current) {
      core.current.rotation.y += delta * 0.55;
      core.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.45) * 0.12;
    }
    if (outer.current) outer.current.rotation.z -= delta * 0.22;
    if (inner.current) inner.current.rotation.z += delta * 0.38;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.25}>
      <group>
        <mesh ref={outer} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.18, 0.035, 12, 120]} />
          <meshStandardMaterial color="#36dfff" emissive="#087fae" emissiveIntensity={2.2} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={inner} rotation={[Math.PI / 2.1, 0.25, 0]}>
          <torusGeometry args={[0.88, 0.022, 10, 100]} />
          <meshStandardMaterial color="#a8f6ff" emissive="#20cfff" emissiveIntensity={2.8} />
        </mesh>
        <mesh ref={core}>
          <icosahedronGeometry args={[0.63, 2]} />
          <meshPhysicalMaterial color="#8befff" emissive="#00a9e8" emissiveIntensity={2.8} metalness={0.65} roughness={0.16} clearcoat={1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshBasicMaterial color="#e8fdff" />
        </mesh>
        <Sparkles count={48} scale={3.5} size={2.2} speed={0.35} color="#62eaff" />
      </group>
    </Float>
  );
}

const Metric = ({ label, value, icon: Icon, tone }: {
  label: string; value: string | number; icon: React.ElementType; tone: string;
}) => (
  <div className="jarvis-metric">
    <span className={`jarvis-metric-icon ${tone}`}><Icon size={15} /></span>
    <span className="jarvis-metric-label">{label}</span>
    <strong>{value}</strong>
  </div>
);

export const JarvisCommandHeader: React.FC<Props> = ({
  adminName, stats, firebaseConnected, maintenance, loading,
}) => {
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.jarvis-status-chip', { opacity: 0, y: 8 }, {
        opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power2.out',
      });
    }, statusRef);
    return () => ctx.revert();
  }, []);

  const operational = !maintenance?.enabled;
  return (
    <motion.section
      className="jarvis-hero"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
    >
      <div className="jarvis-hero-grid" />
      <div className="jarvis-hero-scanline" />
      <div className="jarvis-hero-copy">
        <div className="jarvis-eyebrow"><span className="jarvis-live-dot" /> KOERWERKING // JARVIS ULTIMATE</div>
        <h1>COMMAND <span>CENTER</span></h1>
        <p className="jarvis-welcome">Goedendag{adminName ? `, ${adminName}` : ''}. Alle operationele systemen binnen handbereik.</p>
        <div className="jarvis-status-row" ref={statusRef}>
          <span className="jarvis-status-chip"><Activity size={13}/> {loading ? 'DATA LADEN' : 'ADMIN CONSOLE'}</span>
          <span className={`jarvis-status-chip ${operational ? 'is-good' : 'is-warning'}`}>
            <ShieldCheck size={13}/> {maintenance ? (operational ? 'OPERATIONEEL' : 'ONDERHOUD') : 'STATUS ONBEKEND'}
          </span>
          <span className={`jarvis-status-chip ${firebaseConnected ? 'is-good' : 'is-warning'}`}>
            <Database size={13}/> FIRESTORE {firebaseConnected ? 'ONLINE' : 'NIET BEVESTIGD'}
          </span>
        </div>
      </div>
      <div className="jarvis-reactor-wrap" aria-label="Geanimeerde JARVIS-reactor">
        <div className="jarvis-reactor-halo" />
        <div className="jarvis-reactor-orbit jarvis-reactor-orbit-one" />
        <div className="jarvis-reactor-orbit jarvis-reactor-orbit-two" />
        <div className="jarvis-reactor-crosshair" />
        <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[3, 2, 4]} intensity={2.5} color="#28dfff" />
          <pointLight position={[-3, -2, 2]} intensity={1.2} color="#d78b35" />
          <ReactorCore />
        </Canvas>
        <div className="jarvis-reactor-caption"><Zap size={11}/> ARC REACTOR · {operational ? 'STABLE' : 'ATTENTION'}</div>
      </div>
      <div className="jarvis-metrics">
        <Metric label="TEAMLEDEN" value={stats?.totalUsers ?? '—'} icon={Activity} tone="cyan" />
        <Metric label="ACTIEVE ACCOUNTS" value={stats?.activeUsers ?? '—'} icon={Cpu} tone="green" />
        <Metric label="BEHEERDERS" value={stats?.adminCount ?? '—'} icon={ShieldCheck} tone="gold" />
      </div>
    </motion.section>
  );
};
