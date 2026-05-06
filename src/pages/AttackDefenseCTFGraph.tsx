import * as d3 from 'd3';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Theme {
  teamNameColor: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  cardBackground: string;
  border: string;
  svgBackground: string;
}

interface AttackDefenseCTFGraphProps {
  theme?: string;
  currentTheme: Theme;
  onDataUpdate: (data: Date) => void;
}

interface TeamStatus {
  on: number;
  teams_hit: number[];
}

interface ServiceStatus {
  [service: string]: TeamStatus;
}

interface TimeWindowStatus {
  [window: string]: ServiceStatus;
}

interface TeamData {
  [teamId: string]: string;
}

interface StatusData {
  [teamId: string]: TimeWindowStatus;
}

interface NodeData {
  x: number;
  y: number;
  color: string;
  score: number;
}

interface MessageData {
  srcId: string;
  dstId: string;
  color: string;
}

export default function AttackDefenseCTFGraph({
  currentTheme,
  onDataUpdate,
}: AttackDefenseCTFGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const windowsPerPage = 10;
  const [windowPage, setWindowPage] = useState(0);

  const [isVisible, setIsVisible] = useState(!document.hidden);
  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const sampleTeamId = status !== null ? (Object.keys(status)[0] ?? null) : null;
  const timeWindows: number[] =
    sampleTeamId && status?.[sampleTeamId]
      ? Object.keys(status[sampleTeamId]).map((x) => parseInt(x))
      : [];
  const maxTimeWindow = timeWindows.length > 0 ? Math.max(...timeWindows) : null;

  useEffect(() => {
    if (maxTimeWindow !== null && selectedTimeWindow === null) {
      setSelectedTimeWindow(maxTimeWindow);
      setSearchParams({ window: maxTimeWindow.toString() });
      setWindowPage(Math.floor(maxTimeWindow / windowsPerPage));
    }
  }, [maxTimeWindow, selectedTimeWindow, setSearchParams]);

  useEffect(() => {
    if (selectedTimeWindow !== null) {
      setWindowPage(Math.floor(selectedTimeWindow / windowsPerPage));
    }
  }, [selectedTimeWindow]);

  const activeTimeWindow = selectedTimeWindow !== null ? selectedTimeWindow : maxTimeWindow;

  const totalPages = Math.ceil(timeWindows.length / windowsPerPage);
  const pageStart = windowPage * windowsPerPage;
  const pageEnd = pageStart + windowsPerPage;
  const paginatedWindows = timeWindows.slice(pageStart, pageEnd);

  // console.log('Time Windows:', timeWindows);
  // console.log(timeWindows);
  // console.log(activeTimeWindow);

  useEffect(() => {
    const windowFromURL = parseInt(searchParams.get('window') || '');
    if (!isNaN(windowFromURL)) {
      setSelectedTimeWindow(windowFromURL);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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

    const scores: Record<string, number> = {};
    for (const teamId in status) {
      const teamStatus = status[teamId];
      for (const timeWindow in teamStatus) {
        if (!(activeTimeWindow !== null && parseInt(timeWindow) <= activeTimeWindow)) continue;
        const lastStatus = teamStatus[timeWindow];
        if (!scores[teamId]) {
          scores[teamId] = 0;
        }
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          if (serviceStatus.on) {
            scores[teamId] += 42;
          }
          scores[teamId] += serviceStatus.teams_hit.length * 2;
          for (const otherTeamId in status) {
            if (
              otherTeamId !== teamId &&
              status[otherTeamId][timeWindow][service].teams_hit.includes(parseInt(teamId))
            ) {
              scores[teamId] -= 2;
            }
          }
        }
      }
    }
    console.log('Scores:', scores);

    const svgElement = svgRef.current;
    if (!svgElement) return;
    const containerRect = svgElement.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    const width = containerRect.width;
    const height = containerRect.height;

    const canvasWidth = isMobile ? Math.max(width * 2, 1200) : width;
    const canvasHeight = isMobile ? Math.max(height * 2, 800) : height;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);

    d3.select(svgRef.current).selectAll('*').remove();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    (svg as any).call(zoom);

    const g = svg.append('g');

    const cx = canvasWidth / 2,
      cy = canvasHeight / 2;
    const r = Math.min(canvasWidth, canvasHeight) / 3;
    const team_ids = Object.keys(teams);
    const points = team_ids.map((id, i) => {
      const angle = (2 * Math.PI * i) / team_ids.length;
      return {
        id: id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    const nodes: Record<string, NodeData> = {};
    points.forEach((point, i) => {
      nodes[point.id] = {
        x: point.x,
        y: point.y,
        color: d3.interpolateRainbow(i / team_ids.length),
        score: scores[point.id],
      };
    });

    const firstTeamId = Object.keys(status)[0];
    const services =
      activeTimeWindow !== null && firstTeamId
        ? Object.keys(status[firstTeamId][activeTimeWindow])
        : [];
    // console.log('Services:', services);
    const serviceColors = d3.scaleOrdinal<string>().domain(services).range(d3.schemeCategory10);

    const messages: MessageData[] = [];

    if (activeTimeWindow !== null) {
      for (const teamId in status) {
        const teamStatus = status[teamId];
        const lastStatus = teamStatus[activeTimeWindow];
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          for (const team of serviceStatus.teams_hit) {
            const team_hit_id = team.toString();
            const color = d3.color(serviceColors(service))?.formatHex() || '#000';
            messages.push({
              srcId: teamId,
              dstId: team_hit_id,
              color: color,
            });
          }
        }
      }
    }

    console.log('Messages:', messages);
    console.log('Nodes:', nodes);

    Object.entries(nodes).forEach(([id, node]) => {
      const { x, y, color, score } = node;
      g.append('circle').attr('cx', x).attr('cy', y).attr('r', 20).attr('fill', color);

      const labelOffset = 35;
      const labelY = y < cy ? y - labelOffset : y + labelOffset;
      g.append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', currentTheme.teamNameColor)
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .text(teams[id] + ' (' + (score || 0) + ')');
    });

    const sendMessage = (src: NodeData, dst: NodeData, color: string) => {
      const lineGenerator = d3.line().curve(d3.curveBasis);
      const curvePoints: [number, number][] = [
        [src.x, src.y],
        [
          (src.x + dst.x) / 2 - ((0.5 - Math.random()) * canvasHeight) / 3,
          (src.y + dst.y) / 2 - ((0.5 - Math.random()) * canvasHeight) / 3,
        ],
        [dst.x, dst.y],
      ];
      const pathD = lineGenerator(curvePoints);

      const path = g.append('path').attr('fill', 'none').attr('stroke', 'none').attr('d', pathD);

      const totalLength = path.node()?.getTotalLength() || 0;

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
          return function (t: number) {
            const point = path.node()?.getPointAtLength(t * totalLength);
            if (point) {
              dot.attr('cx', point.x).attr('cy', point.y);
            }
            const trailLength = t * totalLength;
            trail.attr('d', pathD).attr('stroke-dasharray', `${trailLength},${totalLength}`);
          };
        })
        .on('end', () => {
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

    if (isMobile) {
      const initialTransform = d3.zoomIdentity
        .translate((width - canvasWidth * 0.4) / 2, (height - canvasHeight * 0.4) / 2)
        .scale(1);
      svg.call(zoom.transform as any, initialTransform);
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;

    function animateMessages() {
      if (stopped) return;
      messages.forEach((msg) => {
        const src = nodes[msg.srcId];
        const dst = nodes[msg.dstId];
        sendMessage(src, dst, msg.color);
      });
    }

    function loop() {
      if (stopped) return;
      animateMessages();
      const t = setTimeout(loop, 3000);
      timeouts.push(t);
    }

    animateMessages();
    loop();

    return () => {
      stopped = true;
      timeouts.forEach(clearTimeout);
      d3.select(svgRef.current).selectAll('*').remove();
    };
  }, [teams, status, currentTheme, isMobile, selectedTimeWindow, isVisible]);

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
          {timeWindows.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <span className={`text-sm font-medium ${currentTheme.textSecondary}`}>Window</span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setWindowPage((p) => Math.max(0, p - 1))}
                  disabled={windowPage === 0}
                  className={`h-6 w-6 rounded border border-gray-500 text-xs ${currentTheme.cardBackground} ${currentTheme.textSecondary} flex items-center justify-center hover:bg-gray-100 disabled:opacity-50`}
                  title="Previous windows"
                  style={{ minWidth: '1.5rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                {paginatedWindows.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => {
                      setSelectedTimeWindow(tw);
                      setSearchParams({ window: tw.toString() });
                    }}
                    className={`h-6 w-6 rounded border border-gray-500 text-xs ${currentTheme.cardBackground} ${currentTheme.textSecondary} ${tw === activeTimeWindow ? 'ring-2 ring-white' : ''} hover:bg-gray-100`}
                    title={`Time Window ${tw}`}
                  >
                    {tw}
                  </button>
                ))}
                <button
                  onClick={() => setWindowPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={windowPage >= totalPages - 1}
                  className={`h-6 w-6 rounded border border-gray-500 text-xs ${currentTheme.cardBackground} ${currentTheme.textSecondary} flex items-center justify-center hover:bg-gray-100 disabled:opacity-50`}
                  title="Next windows"
                  style={{ minWidth: '1.5rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative h-[calc(100vh-200px)] w-full">
          <div
            className={`absolute ${isMobile ? 'top-2 left-2' : 'top-4 right-4'} z-10 ${isMobile ? 'w-52' : 'w-64'}`}
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
