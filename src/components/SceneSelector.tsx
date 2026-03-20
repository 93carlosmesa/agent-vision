/**
 * SceneSelector — SRP: renders the scene switcher select element only.
 */

import { scenes } from '../scenes/sceneConfig';

interface SceneSelectorProps {
  currentScene: string;
  onSceneChange: (sceneId: string) => void;
}

export function SceneSelector({ currentScene, onSceneChange }: SceneSelectorProps) {
  return (
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
  );
}
