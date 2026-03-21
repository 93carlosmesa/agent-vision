/**
 * Folder3D — Portfolio folders on Biblioteca bookshelves.
 * Each skill is a Manila-style folder placed on shelves, grouped by district.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';

/* ── Hardcoded skill list ── */
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

/* ── District config: bookshelf positions in Biblioteca ── */
const DISTRICT_SHELF: Record<string, {
  cx: number; cz: number;
  color: string; folderColor: string;
  label: string;
}> = {
  inv:    { cx: -12, cz: -13.5, color: '#3b82f6', folderColor: '#c4a35a', label: 'Investment' },
  dev:    { cx: 0,   cz: -13.5, color: '#22c55e', folderColor: '#b0926a', label: 'Development' },
  global: { cx: 12,  cz: -13.5, color: '#e0e0ff', folderColor: '#c9a96e', label: 'Global' },
};

/* ── Single folder on shelf ── */
function ShelfFolder({ position, color, folderColor, label, seed }: {
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
    // Very subtle breathing motion (folders sit on shelves)
    meshRef.current.position.y = position[1] + Math.sin(t * 0.3 + seed * 2) * 0.01;
  });

  return (
    <group position={position}>
      <group ref={meshRef}>
        {/* Back cover — standing upright */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.25, 0.35, 0.01]} />
          <meshStandardMaterial color={folderColor} roughness={0.8} />
        </mesh>
        {/* Front cover — slightly tilted */}
        <mesh position={[0, -0.005, 0.018]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.25, 0.34, 0.01]} />
          <meshStandardMaterial color={folderColor} roughness={0.8} />
        </mesh>
        {/* Tab at top */}
        <mesh position={[-0.04, 0.19, -0.01]}>
          <boxGeometry args={[0.1, 0.04, 0.012]} />
          <meshStandardMaterial color={folderColor} roughness={0.7} />
        </mesh>
        {/* Inner pages */}
        <mesh position={[0, -0.01, 0.003]}>
          <boxGeometry args={[0.22, 0.3, 0.015]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
        </mesh>
        {/* District color accent strip */}
        <mesh position={[0, -0.16, 0.024]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.23, 0.025, 0.002]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Label */}
      <Html position={[0, -0.3, 0]} center distanceFactor={14} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <div style={{
          background: 'rgba(20,18,15,0.85)',
          color,
          padding: '1px 5px',
          borderRadius: '3px',
          fontSize: '8px',
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

/* ── District label ── */
function DistrictLabel({ position, label, color }: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Html position={position} center distanceFactor={18} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      <div style={{
        background: 'rgba(20,18,15,0.75)',
        color,
        padding: '3px 10px',
        borderRadius: '4px',
        fontSize: '11px',
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

/* ── All skill folders on Biblioteca shelves ── */
export function SkillFolders3D() {
  const grouped = {
    inv: SKILLS_3D.filter(s => s.district === 'inv'),
    dev: SKILLS_3D.filter(s => s.district === 'dev'),
    global: SKILLS_3D.filter(s => s.district === 'global'),
  };

  return (
    <group>
      {Object.entries(grouped).map(([district, skills]) => {
        const shelf = DISTRICT_SHELF[district];

        // Place folders along the shelf, evenly spaced
        const shelfWidth = district === 'dev' ? 4.5 : 3.5;

        return (
          <group key={district}>
            {/* District label above bookshelf */}
            <DistrictLabel
              position={[shelf.cx, 2.8, shelf.cz]}
              label={shelf.label}
              color={shelf.color}
            />

            {/* Folders on shelves — distribute across shelf rows */}
            {skills.map((skill, i) => {
              const shelfRow = i < Math.ceil(skills.length / 2) ? 0 : 1;
              const idxInRow = shelfRow === 0 ? i : i - Math.ceil(skills.length / 2);
              const rowCount = shelfRow === 0 ? Math.ceil(skills.length / 2) : skills.length - Math.ceil(skills.length / 2);
              const rowSpacing = shelfWidth / Math.max(rowCount, 1);
              const x = shelf.cx - shelfWidth / 2 + rowSpacing * 0.5 + idxInRow * rowSpacing;
              // Bottom shelf row = y 0.2, second shelf row = y 0.75
              const y = shelfRow === 0 ? 0.2 : 0.75;
              const z = shelf.cz + 0.1;

              return (
                <ShelfFolder
                  key={skill.id}
                  position={[x, y, z]}
                  color={shelf.color}
                  folderColor={shelf.folderColor}
                  label={skill.label}
                  seed={i * 1.7 + district.charCodeAt(0)}
                />
              );
            })}

            {/* Subtle accent light per district */}
            <pointLight
              position={[shelf.cx, 1.5, shelf.cz + 0.5]}
              intensity={0.4}
              color={shelf.color}
              distance={3}
            />
          </group>
        );
      })}
    </group>
  );
}
