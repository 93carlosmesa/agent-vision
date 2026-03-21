/**
 * SkillObject3D — Floating rotating crystal per skill, grouped by district.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';

/* ── Hardcoded skill list from workspace ── */
interface Skill3D {
  id: string;
  label: string;
  district: 'inv' | 'dev' | 'global';
}

const SKILLS_3D: Skill3D[] = [
  { id: 'inv--us-open-predictor',       label: 'US Open Predictor',       district: 'inv' },
  { id: 'inv--worldmonitor-radar',      label: 'WorldMonitor Radar',      district: 'inv' },
  { id: 'inv--psych-market',            label: 'Psych Market',            district: 'inv' },
  { id: 'dev--git-guardian',            label: 'Git Guardian',            district: 'dev' },
  { id: 'dev--codereviewer',            label: 'Code Reviewer',           district: 'dev' },
  { id: 'dev--cybersec-auditor',        label: 'Cybersec Auditor',        district: 'dev' },
  { id: 'dev--ui-usability-analyst',    label: 'UI Usability Analyst',    district: 'dev' },
  { id: 'dev--backend-socket-architect',label: 'Backend Socket Arch',     district: 'dev' },
  { id: 'dev--fullstack-smoke-tester',  label: 'Fullstack Smoke Test',    district: 'dev' },
  { id: 'dev--3d-world-builder',        label: '3D World Builder',        district: 'dev' },
  { id: 'global--gog',                  label: 'GoG',                     district: 'global' },
  { id: 'global--browser-automation',   label: 'Browser Automation',      district: 'global' },
  { id: 'global--diagram-visualizer',   label: 'Diagram Visualizer',      district: 'global' },
  { id: 'global--gemini-image-generator',label: 'Gemini Image Gen',       district: 'global' },
  { id: 'global--nexo-board-ops',       label: 'Nexo Board Ops',          district: 'global' },
];

/* ── District positioning & colors ── */
const DISTRICT_CONFIG: Record<string, { cx: number; cz: number; color: string }> = {
  inv:    { cx: -6, cz: -8,  color: '#3b82f6' },
  dev:    { cx: 0,  cz: -10, color: '#22c55e' },
  global: { cx: 6,  cz: -8,  color: '#e0e0ff' },
};

/* ── Single floating crystal ── */
function Crystal({ position, color, label, seed }: {
  position: [number, number, number];
  color: string;
  label: string;
  seed: number;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.5 + seed;
    meshRef.current.rotation.x = Math.sin(t * 0.3 + seed) * 0.15;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + seed * 2) * 0.12;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.85}
          wireframe={false}
        />
      </mesh>

      {/* Glow halo */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Label */}
      <Html
        position={[0, -0.5, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      >
        <div style={{
          background: 'rgba(10,10,26,0.8)',
          color,
          padding: '1px 6px',
          borderRadius: '3px',
          fontSize: '9px',
          fontFamily: 'monospace',
          fontWeight: 500,
          border: `1px solid ${color}30`,
          textShadow: `0 0 4px ${color}`,
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

/* ── District label ── */
function DistrictLabel({ position, label, color }: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={16}
      style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
    >
      <div style={{
        background: 'rgba(10,10,26,0.7)',
        color,
        padding: '3px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        border: `1px solid ${color}50`,
        textShadow: `0 0 8px ${color}`,
      }}>
        {label}
      </div>
    </Html>
  );
}

/* ── All skill crystals ── */
export function SkillObjects3D() {
  const grouped = {
    inv: SKILLS_3D.filter(s => s.district === 'inv'),
    dev: SKILLS_3D.filter(s => s.district === 'dev'),
    global: SKILLS_3D.filter(s => s.district === 'global'),
  };

  return (
    <group>
      {Object.entries(grouped).map(([district, skills]) => {
        const config = DISTRICT_CONFIG[district];
        const cols = Math.min(skills.length, district === 'dev' ? 4 : 3);

        return (
          <group key={district}>
            <DistrictLabel
              position={[config.cx, 1.5, config.cz - 1.8]}
              label={district === 'inv' ? 'Investment' : district === 'dev' ? 'Development' : 'Global'}
              color={config.color}
            />

            {/* District floor glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[config.cx, 0.01, config.cz]}>
              <planeGeometry args={[cols * 1.8 + 1, Math.ceil(skills.length / cols) * 1.6 + 1]} />
              <meshStandardMaterial
                color={config.color}
                emissive={config.color}
                emissiveIntensity={0.2}
                transparent
                opacity={0.06}
              />
            </mesh>

            {skills.map((skill, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = config.cx - (cols - 1) * 0.8 + col * 1.6;
              const z = config.cz + row * 1.4;

              return (
                <Crystal
                  key={skill.id}
                  position={[x, 0.8, z]}
                  color={config.color}
                  label={skill.label}
                  seed={i * 1.7 + district.charCodeAt(0)}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
