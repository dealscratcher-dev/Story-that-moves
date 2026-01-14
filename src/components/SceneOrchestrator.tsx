import { useState, useEffect, useCallback } from 'react';
import { ScrollWaypoint, StoryboardScene } from '../types/storyboard';

interface SceneOrchestratorProps {
  waypoints: ScrollWaypoint[];
  scrollPercent: number;
  onActiveSceneChange: (scene: StoryboardScene | null, waypointId: string | null) => void;
  debugMode?: boolean;
}

interface ActiveWaypoint {
  waypoint: ScrollWaypoint;
  activationPercent: number;
  deactivationPercent: number;
}

export default function SceneOrchestrator({
  waypoints,
  scrollPercent,
  onActiveSceneChange,
  debugMode = false
}: SceneOrchestratorProps) {
  const [activeWaypoint, setActiveWaypoint] = useState<ActiveWaypoint | null>(null);

  const findActiveWaypoint = useCallback((percent: number): ActiveWaypoint | null => {
    for (const waypoint of waypoints) {
      const activationPercent = waypoint.scrollPercent;
      const deactivationPercent = waypoint.scrollPercent + waypoint.duration;

      if (percent >= activationPercent && percent <= deactivationPercent) {
        return {
          waypoint,
          activationPercent,
          deactivationPercent
        };
      }
    }
    return null;
  }, [waypoints]);

  useEffect(() => {
    const newActiveWaypoint = findActiveWaypoint(scrollPercent);

    if (newActiveWaypoint?.waypoint.id !== activeWaypoint?.waypoint.id) {
      setActiveWaypoint(newActiveWaypoint);

      if (newActiveWaypoint) {
        onActiveSceneChange(newActiveWaypoint.waypoint.scene, newActiveWaypoint.waypoint.id);
      } else {
        onActiveSceneChange(null, null);
      }
    }
  }, [scrollPercent, findActiveWaypoint, activeWaypoint, onActiveSceneChange]);

  if (!debugMode) return null;

  return (
    <div className="fixed left-0 top-0 w-full h-full pointer-events-none z-40">
      {waypoints.map((waypoint) => {
        const isActive = activeWaypoint?.waypoint.id === waypoint.id;

        return (
          <div
            key={waypoint.id}
            className="absolute left-0 w-full"
            style={{
              top: `${waypoint.scrollPercent}%`,
              height: `${waypoint.duration}%`,
            }}
          >
            <div
              className={`w-full h-full border-2 transition-all ${
                isActive
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-red-500/50 bg-red-500/10'
              }`}
            >
              <div className="absolute left-2 top-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {waypoint.id} - {waypoint.scene.type}
                {isActive && <span className="ml-2 text-green-400">● ACTIVE</span>}
              </div>
            </div>

            <div
              className="absolute left-0 w-full h-0.5 bg-yellow-400"
              style={{ top: 0 }}
            />
            <div
              className="absolute left-0 w-full h-0.5 bg-blue-400"
              style={{ bottom: 0 }}
            />
          </div>
        );
      })}

      <div
        className="absolute left-0 w-full h-1 bg-purple-500 shadow-lg shadow-purple-500/50"
        style={{ top: `${scrollPercent}%` }}
      >
        <div className="absolute right-4 top-1 bg-purple-500 text-white text-xs px-2 py-1 rounded">
          {scrollPercent.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
