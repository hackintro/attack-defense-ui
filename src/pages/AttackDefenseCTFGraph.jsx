import * as d3 from 'd3';
import { act, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // Make sure you use react-router

export default function AttackDefenseCTFGraph({ theme, currentTheme, onDataUpdate }) {
  const svgRef = useRef();
  // const [nodes, setNodes] = useState(null);
  const [teams, setTeams] = useState(null);
  const [status, setStatus] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [selectedTimeWindow, setSelectedTimeWindow] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const sampleTeamId = status !== null ? Object.keys(status)[0] : null;

  const timeWindows = sampleTeamId && status[sampleTeamId] ? Object.keys(status[sampleTeamId]).map((x) => parseInt(x)) : [];

  console.log('Time Windows:', timeWindows);

  console.log(timeWindows);
  const maxTimeWindow = timeWindows.length > 0 ? Math.max(...timeWindows) : null;
  const activeTimeWindow = selectedTimeWindow !== null ? selectedTimeWindow : maxTimeWindow;

  console.log(activeTimeWindow);

  useEffect(() => {
    const windowFromURL = parseInt(searchParams.get('window'));
    if (!isNaN(windowFromURL)) {
      setSelectedTimeWindow(windowFromURL);
    }
  }, [searchParams]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    //  Uncomment below to fetch real data from API
    fetch('/status')
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams);
        setStatus(data.status);
        onDataUpdate(new Date());
      })
      .catch((err) => console.error('Failed to fetch nodes:', err));

    onDataUpdate(new Date());
  }, [onDataUpdate]);

  useEffect(() => {
    if (!teams || !status) return;

    // Compute score per team
    const scores = {};
    // Every window, each team gathers 42 points for each operational service.
    // They lose 2 points for each team that hits them
    // They gain 2 points for each team they hit
    for (const teamId in status) {
      const teamStatus = status[teamId];
      for (const timeWindow in teamStatus) {
        if (!(activeTimeWindow !== null && parseInt(timeWindow) <= activeTimeWindow)) continue; // Skip past time windows if activeTimeWindow is set
        const lastStatus = teamStatus[timeWindow];
        if (!scores[teamId]) {
          scores[teamId] = 0;
        }
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          if (serviceStatus.on) {
            scores[teamId] += 42; // Each operational service gives 42 points
          }
          scores[teamId] += serviceStatus.teams_hit.length * 2; // Each team hit gives 2 points
          for (const otherTeamId in status) {
            if (otherTeamId !== teamId && status[otherTeamId][timeWindow][service].teams_hit.includes(parseInt(teamId))) {
              // If another team hit this team, they lose 2 points
              scores[teamId] -= 2;
            }
          }
        }
      }
    }
    console.log('Scores:', scores);

    // Get dynamic dimensions from the SVG container
    const svgElement = svgRef.current;
    const containerRect = svgElement.parentElement.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Use larger canvas for mobile to enable zooming/panning
    const canvasWidth = isMobile ? Math.max(width * 2, 1200) : width;
    const canvasHeight = isMobile ? Math.max(height * 2, 800) : height;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);

    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Apply zoom to SVG
    svg.call(zoom);

    // Create a group for all content that will be zoomed/panned
    const g = svg.append('g');

    // Define nodes and messages
    // Let's position nodes in a circular layout for better visibility
    // first compute the x,y coordinates for each node
    const cx = canvasWidth / 2,
      cy = canvasHeight / 2; // Center of the circle
    const r = Math.min(canvasWidth, canvasHeight) / 3; // Radius of the circle, responsive to container size
    const team_ids = Object.keys(teams);
    const points = team_ids.map((id, i) => {
      const angle = (2 * Math.PI * i) / team_ids.length;
      return {
        id: id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    const nodes = {};
    points.forEach((point, i) => {
      nodes[point.id] = {
        x: point.x,
        y: point.y,
        color: d3.interpolateRainbow(i / team_ids.length),
        score: scores[point.id],
      };
    });

    // Example status message:
    // {"1":{"0":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"1":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"2":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"3":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}}},"2":{"0":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"1":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"2":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"3":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}}},"3":{"0":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"1":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"2":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"3":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}}},"4":{"0":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"1":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"2":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"3":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}}}}
    // for each team, we show the status for every time window for each service.
    // When plotting we just need to plot the status at the last time window.

    const services = activeTimeWindow !== null ? Object.keys(status[1][activeTimeWindow]) : [];
    console.log('Services:', services);
    // create a map from every service to a color
    const serviceColors = d3.scaleOrdinal().domain(services).range(d3.schemeCategory10);

    const messages = [];

    if (activeTimeWindow !== null) {
      for (const teamId in status) {
        const teamStatus = status[teamId];
        const lastStatus = teamStatus[activeTimeWindow];
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          //if (serviceStatus.on) {
          // For each service that is on, we create a message
          for (const team of serviceStatus.teams_hit) {
            const team_hit_id = team.toString();
            const color = d3.color(serviceColors(service)).formatHex();
            messages.push([teamId, team_hit_id, color]);
          }
        }
      }
    }

    console.log('Messages:', messages);

    console.log('Nodes:', nodes);

    // Render nodes - now in the zoomable group
    Object.entries(nodes).forEach(([id, { x, y, color, score }]) => {
      g.append('circle').attr('cx', x).attr('cy', y).attr('r', 20).attr('fill', color);

      const labelOffset = 35; // Distance from node
      const labelY = y < cy ? y - labelOffset : y + labelOffset;
      g.append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', currentTheme.teamNameColor) // Use theme-based color
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .text(teams[id] + ' (' + (score || 0) + ')');
    });

    const sendMessage = (src, dst, color) => {
      const lineGenerator = d3.line().curve(d3.curveBasis);
      const curvePoints = [
        [src.x, src.y],
        [
          (src.x + dst.x) / 2 - ((0.5 - Math.random()) * canvasHeight) / 3,
          (src.y + dst.y) / 2 - ((0.5 - Math.random()) * canvasHeight) / 3,
        ],
        [dst.x, dst.y],
      ];
      const pathD = lineGenerator(curvePoints);

      const path = g.append('path').attr('fill', 'none').attr('stroke', 'none').attr('d', pathD);

      const totalLength = path.node().getTotalLength();

      const trail = g
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2);

      const dot = g.append('circle').attr('r', 6).attr('fill', color);

      dot
        .transition()
        .duration(3000)
        .ease(d3.easeLinear)
        .tween('pathTween', () => {
          return function (t) {
            const point = path.node().getPointAtLength(t * totalLength);
            dot.attr('cx', point.x).attr('cy', point.y);
            const trailLength = t * totalLength;
            trail.attr('d', pathD).attr('stroke-dasharray', `${trailLength},${totalLength}`);
          };
        })
        .on('end', () => {
          // Explosion effect at destination
          const duration = 1000;
          const explosion = g
            .append('circle')
            .attr('cx', dst.x)
            .attr('cy', dst.y)
            .attr('r', 0)
            .attr('fill', 'orange')
            .attr('opacity', 0.3);

          explosion.transition().duration(duration).attr('r', 50).attr('opacity', 0).remove();
          dot.remove();
          trail.remove();
          path.remove();
        });
    };

    // Center the view initially for mobile
    if (isMobile) {
      const initialTransform = d3.zoomIdentity
        .translate((width - canvasWidth * 0.4) / 2, (height - canvasHeight * 0.4) / 2)
        .scale(1);
      svg.call(zoom.transform, initialTransform);
    }

    // Send messages on interval
    const interval = setInterval(() => {
      messages.forEach(([srcId, dstId, color]) => {
        const src = nodes[srcId];
        const dst = nodes[dstId];
        sendMessage(src, dst, color);
      });
    }, 3000);

    // Trigger first send immediately
    messages.forEach(([srcId, dstId, color]) => {
      const src = nodes[srcId];
      const dst = nodes[dstId];
      sendMessage(src, dst, color);
    });

    return () => clearInterval(interval);
  }, [teams, status, theme, isMobile, selectedTimeWindow]);

  return (
    <>
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${currentTheme.textPrimary} mb-2`}>
              Real-time Attack Visualization
            </h2>
            <p className={currentTheme.textSecondary}>
              Monitor live attacks and defenses between competing teams
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-center">
          {/* Time Window Selector */}
          {timeWindows.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <span className={`text-sm font-medium ${currentTheme.textSecondary}`}>
                Window
              </span>
              <div className="flex flex-wrap gap-1">
                {timeWindows.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => {
                      setSelectedTimeWindow(tw);
                      setSearchParams({ window: tw });
                    }}
                    className={`w-6 h-6 text-xs rounded ${tw === activeTimeWindow ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'} hover:bg-blue-400`}
                    title={`Time Window ${tw}`}
                  >
                    {tw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Full screen graph container with overlay scoring system */}
        <div className="relative h-[calc(100vh-200px)] w-full">
          {/* Scoring System - Responsive positioning */}
          <div
            className={`absolute ${isMobile ? 'left-2 top-2' : 'right-4 top-4'} z-10 ${isMobile ? 'w-52' : 'w-64'}`}
          >
            <div
              className={`${currentTheme.cardBackground} rounded-lg border p-3 shadow-lg ${currentTheme.border} ${isMobile ? 'text-xs' : ''}`}
            >
              <h3
                className={`${currentTheme.textPrimary} mb-2 font-semibold ${isMobile ? 'text-sm' : ''}`}
              >
                Scoring System
              </h3>
              <div className={`space-y-1 text-xs ${currentTheme.textTertiary}`}>
                <div className="flex justify-between">
                  <span>Operational Service:</span>
                  <span className="text-green-400">+42 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful Attack:</span>
                  <span className="text-blue-400">+2 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Compromised Service:</span>
                  <span className="text-red-400">-2 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile instructions */}
          {isMobile && (
            <div className="absolute bottom-4 left-4 z-10">
              <div
                className={`${currentTheme.cardBackground} rounded-lg border p-2 shadow-lg ${currentTheme.border}`}
              >
                <p className={`text-xs ${currentTheme.textSecondary}`}>
                  Pinch to zoom • Drag to pan
                </p>
              </div>
            </div>
          )}

          {/* Full screen SVG graph */}
          <div className={`h-full w-full ${currentTheme.cardBackground} rounded-lg`}>
            <svg
              ref={svgRef}
              className={`h-full w-full border ${currentTheme.border} rounded ${currentTheme.svgBackground} ${isMobile ? 'cursor-grab active:cursor-grabbing' : ''}`}
            ></svg>
          </div>
        </div>
      </main>
    </>
  );
}
