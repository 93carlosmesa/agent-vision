/**
 * SceneSelector — 3D environment switch.
 */

import { WORLD_ENVIRONMENTS } from './world3d/officeTheme';

interface SceneSelectorProps {
  currentEnvironment: string;
  onEnvironmentChange: (environmentId: string) => void;
}

export function SceneSelector({
  currentEnvironment,
  onEnvironmentChange,
}: SceneSelectorProps) {
  return (
    <div className="scene-selector-wrap">
      <div className="scene-selector">
        <label className="scene-selector-label" htmlFor="env-select">
          🏙️ Ambiente:
        </label>
        <select
          id="env-select"
          className="scene-selector-select"
          value={currentEnvironment}
          onChange={(e) => onEnvironmentChange(e.target.value)}
        >
          {WORLD_ENVIRONMENTS.map((env) => (
            <option key={env.id} value={env.id}>
              {env.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
