/**
 * Folder3D — Portfolio folders replacing crystal skill objects.
 * Each skill is a Manila-style folder on a bookshelf, grouped by district.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';

/* ── Hardcoded skill list (same as original) ── */
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
const DISTRICT_CONFIG: Record<string, { cx: number; cz: number; color: string; folderColor: string }> = {
  inv:    { cx: -6, cz: -8,  color: '#3b82f6', folderColor: '#c4a35a' },
  dev:    { cx: 0,  cz: -10, color: '#22c55e', folderColor: '#b0926a' },
  global: { cx: 6,  cz: -8,  color: '#e0e0ff', folderColor: '#c9a96e' },
};

/* ── Single floating folder ── */
function Folder({ position, color, folderColor, label, seed }: {
  position: [number, number, number];
  color: string;
  folderColor: string;
  label: string;
  seed: number;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle slow rotation (slower than crystals)
    meshRef.current.rotation.y = t * 0.2 + seed;
    meshRef.current.rotation.x = Math.sin(t * 0.15 + seed) * 0.05;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5 + seed * 2) * 0.06;
  });

  return (
    <group position={position}>
      <group ref={meshRef}>
        {/* Back cover */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.3, 0.4, 0.012]} />
          <meshStandardMaterial color={folderColor} roughness={0.8} />
        </mesh>
        {/* Front cover — slightly open */}
        <mesh position={[0, -0.01, 0.025]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.3, 0.38, 0.012]} />
          <meshStandardMaterial color={folderColor} roughness={0.8} />
        </mesh>
        {/* Tab at top */}
        <mesh position={[-0.06, 0.22, -0.02]}>
          <boxGeometry args={[0.12, 0.06, 0.014]} />
          <meshStandardMaterial color={folderColor} roughness={0.7} />
        </mesh>
        {/* Inner "paper" pages visible in the gap */}
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[0.26, 0.34, 0.02]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
        </mesh>
        {/* Subtle district color accent strip */}
        <mesh position={[0, -0.19, 0.032]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.28, 0.03, 0.002]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* Label */}
      <Html
        position={[0, -0.45, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      >
        <div style={{
          background: 'rgba(20,18,15,0.85)',
          color,
          padding: '1px 6px',
          borderRadius: '3px',
          fontSize: '9px',
          fontFamily: 'monospace',
          fontWeight: 500,
          border: `1px solid ${color}30`,
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

/* ── Bookshelf for a district ── */
function Bookshelf({ position, slots, color }: {
  position: [number, number, number];
  slots: number;
  color: string;
}) {
  const shelfW = Math.max(slots * 0.55, 2);
  const dividers = [];
  for (let i = 0; i <= slots; i++) {
    dividers.push(
      <mesh key={i} position={[-shelfW / 2 + (i * shelfW) / slots, 0.2, 0]}>
        <boxGeometry args={[0.03, 0.4, 0.35]} />
        <meshStandardMaterial color="#3a302a" roughness={0.8} />
      </mesh>
    );
  }

  return (
    <group position={position}>
      {/* Bottom shelf */}
      <mesh position={[0, 0.0, 0]}>
        <boxGeometry args={[shelfW + 0.1, 0.04, 0.38]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.7} />
      </mesh>
      {/* Top shelf */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[shelfW + 0.1, 0.04, 0.38]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.7} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 0.2, -0.17]}>
        <boxGeometry args={[shelfW + 0.1, 0.4, 0.02]} />
        <meshStandardMaterial color="#3a302a" roughness={0.8} />
      </mesh>
      {/* Dividers */}
      {dividers}
      {/* Subtle accent light */}
      <pointLight position={[0, 0.5, 0.3]} intensity={0.3} color={color} distance={2} />
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
        background: 'rgba(20,18,15,0.75)',
        color,
        padding: '3px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        border: `1px solid ${color}50`,
      }}>
        {label}
      </div>
    </Html>
  );
}

/* ── All skill folders grouped by district ── */
export function SkillFolders3D() {
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

            {/* Bookshelf on the ground */}
            <Bookshelf
              position={[config.cx, 0, config.cz + 0.5]}
              slots={Math.min(skills.length, cols)}
              color={config.color}
            />

            {/* Subtle floor area marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[config.cx, 0.01, config.cz]}>
              <planeGeometry args={[cols * 1.8 + 1, Math.ceil(skills.length / cols) * 1.6 + 1]} />
              <meshStandardMaterial
                color={config.color}
                emissive={config.color}
                emissiveIntensity={0.1}
                transparent
                opacity={0.04}
              />
            </mesh>

            {/* Floating folders */}
            {skills.map((skill, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = config.cx - (cols - 1) * 0.8 + col * 1.6;
              const z = config.cz + row * 1.4;

              return (
                <Folder
                  key={skill.id}
                  position={[x, 0.8, z]}
                  color={config.color}
                  folderColor={config.folderColor}
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
