/**
 * SceneSelector — scene + 3D environment switches.
 */

import { scenes } from '../scenes/sceneConfig';
import { WORLD_ENVIRONMENTS } from './world3d/officeTheme';

interface SceneSelectorProps {
  currentScene: string;
  onSceneChange: (sceneId: string) => void;
  currentEnvironment: string;
  onEnvironmentChange: (environmentId: string) => void;
}

export function SceneSelector({
  currentScene,
  onSceneChange,
  currentEnvironment,
  onEnvironmentChange,
}: SceneSelectorProps) {
  return (
    <div className="scene-selector-wrap">
      <div className="scene-selector">
        <label className="scene-selector-label" htmlFor="scene-select">
          🎬 Escena:
        </label>
        <select
          id="scene-select"
          className="scene-selector-select"
          value={currentScene}
          onChange={(e) => onSceneChange(e.target.value)}
        >
          {Object.values(scenes).map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      </div>

      {currentScene === '3d' && (
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
      )}
    </div>
  );
}
