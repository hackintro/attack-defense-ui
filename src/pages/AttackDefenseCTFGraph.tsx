import { type StatusData, type TeamData, computeCumulativeScores } from '@/lib/scoring';
import { readHslToken } from '@/lib/theme';
import * as d3 from 'd3';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface AttackDefenseCTFGraphProps {
  onDataUpdate: (data: Date) => void;
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

const WINDOWS_PER_PAGE = 10;

export default function AttackDefenseCTFGraph({ onDataUpdate }: AttackDefenseCTFGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [windowPage, setWindowPage] = useState(0);

  const sampleTeamId = status !== null ? (Object.keys(status)[0] ?? null) : null;
  const timeWindows: number[] = useMemo(
    () =>
      sampleTeamId && status?.[sampleTeamId]
        ? Object.keys(status[sampleTeamId]).map((x) => parseInt(x))
        : [],
    [sampleTeamId, status]
  );
  const maxTimeWindow = timeWindows.length > 0 ? Math.max(...timeWindows) : null;

  useEffect(() => {
    if (maxTimeWindow !== null && selectedTimeWindow === null) {
      setSelectedTimeWindow(maxTimeWindow);
      setSearchParams({ window: maxTimeWindow.toString() });
      setWindowPage(Math.floor(maxTimeWindow / WINDOWS_PER_PAGE));
    }
  }, [maxTimeWindow, selectedTimeWindow, setSearchParams]);

  useEffect(() => {
    if (selectedTimeWindow !== null) {
      setWindowPage(Math.floor(selectedTimeWindow / WINDOWS_PER_PAGE));
    }
  }, [selectedTimeWindow]);

  const activeTimeWindow = selectedTimeWindow !== null ? selectedTimeWindow : maxTimeWindow;

  const totalPages = Math.ceil(timeWindows.length / WINDOWS_PER_PAGE);
  const pageStart = windowPage * WINDOWS_PER_PAGE;
  const pageEnd = pageStart + WINDOWS_PER_PAGE;
  const paginatedWindows = timeWindows.slice(pageStart, pageEnd);

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
      .catch((err) => console.error('Failed to fetch status:', err));
  }, [onDataUpdate]);

  // Recompute cumulative scores up to the active window. Memoized so we
  // don't re-run the O(T·W·S·N) scan on every render.
  const scores = useMemo(
    () => (status ? computeCumulativeScores(status, activeTimeWindow).scores : {}),
    [status, activeTimeWindow]
  );

  useEffect(() => {
    if (!teams || !status) return;

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

    (svg as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom);

    const g = svg.append('g');

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const r = Math.min(canvasWidth, canvasHeight) / 3;
    const team_ids = Object.keys(teams);
    const points = team_ids.map((id, i) => {
      const angle = (2 * Math.PI * i) / team_ids.length;
      return {
        id,
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
        score: scores[point.id] ?? 0,
      };
    });

    const firstTeamId = Object.keys(status)[0];
    const services =
      activeTimeWindow !== null && firstTeamId
        ? Object.keys(status[firstTeamId][activeTimeWindow])
        : [];
    const serviceColors = d3.scaleOrdinal<string>().domain(services).range(d3.schemeCategory10);

    const messages: MessageData[] = [];

    if (activeTimeWindow !== null) {
      for (const teamId in status) {
        const teamStatus = status[teamId];
        const lastStatus = teamStatus[activeTimeWindow];
        if (!lastStatus) continue;
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          for (const team of serviceStatus.teams_hit) {
            const team_hit_id = team.toString();
            const color = d3.color(serviceColors(service))?.formatHex() || '#000';
            messages.push({ srcId: teamId, dstId: team_hit_id, color });
          }
        }
      }
    }

    // Resolve the foreground color once for SVG labels so they follow the
    // active Cyber Noir theme without re-running on every animation tick.
    const labelColor = readHslToken('--foreground') || '#e6edf3';
    const explosionColor = readHslToken('--warning') || 'orange';

    Object.entries(nodes).forEach(([id, node]) => {
      const { x, y, color, score } = node;
      g.append('circle').attr('cx', x).attr('cy', y).attr('r', 20).attr('fill', color);

      const labelOffset = 35;
      const labelY = y < cy ? y - labelOffset : y + labelOffset;
      g.append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .text(teams[id] + ' (' + (score || 0) + ')');
    });

    // Animation tuning. The previous implementation spawned every attack
    // simultaneously every 3 s, which means a window with 200 attacks
    // produced ~600 live SVG nodes + 200 concurrent D3 transitions. That's
    // the source of the lag. We now:
    //   • Cap attacks per cycle (random sample if exceeded), keeping the
    //     visual sense of "lots happening" without the DOM melting.
    //   • Stagger spawns evenly across the cycle so per-frame work is bounded.
    //   • Shorten the trail-travel duration so cycles don't pile up.
    //   • Pause the loop when the tab is hidden, *without* remounting.
    const CYCLE_MS = 3000;
    const ATTACK_DURATION = 1800;
    const EXPLOSION_DURATION = 800;
    const MAX_ATTACKS_PER_CYCLE = 80;

    const cycleMessages =
      messages.length > MAX_ATTACKS_PER_CYCLE
        ? [...messages].sort(() => Math.random() - 0.5).slice(0, MAX_ATTACKS_PER_CYCLE)
        : messages;
    const stagger = cycleMessages.length > 0 ? CYCLE_MS / cycleMessages.length : 0;

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
        .duration(ATTACK_DURATION)
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
          const explosion = g
            .append('circle')
            .attr('cx', dst.x)
            .attr('cy', dst.y)
            .attr('r', 0)
            .attr('fill', explosionColor)
            .attr('opacity', 0.3);

          explosion
            .transition()
            .duration(EXPLOSION_DURATION)
            .attr('r', 50)
            .attr('opacity', 0)
            .remove();
          dot.remove();
          trail.remove();
          path.remove();
        });
    };

    if (isMobile) {
      const initialTransform = d3.zoomIdentity
        .translate((width - canvasWidth * 0.4) / 2, (height - canvasHeight * 0.4) / 2)
        .scale(1);
      svg.call(zoom.transform as unknown as Parameters<typeof svg.call>[0], initialTransform);
    }

    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    let stopped = false;
    let paused = document.hidden;

    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);

    function fireCycle() {
      if (stopped || paused) return;
      cycleMessages.forEach((msg, i) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          if (stopped || paused) return;
          const src = nodes[msg.srcId];
          const dst = nodes[msg.dstId];
          if (src && dst) sendMessage(src, dst, msg.color);
        }, i * stagger);
        timeouts.add(t);
      });
    }

    function loop() {
      if (stopped) return;
      fireCycle();
      const t = setTimeout(() => {
        timeouts.delete(t);
        loop();
      }, CYCLE_MS);
      timeouts.add(t);
    }

    loop();

    return () => {
      stopped = true;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      document.removeEventListener('visibilitychange', onVisibility);
      d3.select(svgRef.current).selectAll('*').remove();
    };
  }, [teams, status, scores, isMobile, activeTimeWindow]);

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2 text-2xl font-bold">
            Real-time Attack Visualization
          </h2>
          <p className="text-muted-foreground">
            Monitor live attacks and defenses between competing teams
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center">
        {timeWindows.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">Window</span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setWindowPage((p) => Math.max(0, p - 1))}
                disabled={windowPage === 0}
                aria-label="Previous time-window page"
                className="bg-card text-muted-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded border text-xs not-disabled:cursor-pointer disabled:opacity-50"
                style={{ minWidth: '1.5rem' }}
              >
                <ChevronLeft size={16} />
              </button>
              {paginatedWindows.map((tw) => {
                const active = tw === activeTimeWindow;
                return (
                  <button
                    key={tw}
                    onClick={() => {
                      setSelectedTimeWindow(tw);
                      setSearchParams({ window: tw.toString() });
                    }}
                    aria-current={active ? 'true' : undefined}
                    title={`Time Window ${tw}`}
                    className={`h-8 w-8 cursor-pointer rounded border text-xs ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary ring-ring ring-offset-background ring-2 ring-offset-1'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tw}
                  </button>
                );
              })}
              <button
                onClick={() => setWindowPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={windowPage >= totalPages - 1}
                aria-label="Next time-window page"
                className="bg-card text-muted-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded border text-xs not-disabled:cursor-pointer disabled:opacity-50"
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
            className={`bg-card border-border rounded-lg border p-3 shadow-lg ${isMobile ? 'text-xs' : ''}`}
          >
            <h3 className={`text-foreground mb-2 font-semibold ${isMobile ? 'text-sm' : ''}`}>
              Scoring System
            </h3>
            <div className="text-muted-foreground space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Operational Service:</span>
                <span className="text-success font-semibold">+42 pts (scaled by patch diff)</span>
              </div>
              <div className="flex justify-between">
                <span>Successful Attack:</span>
                <span className="text-info font-semibold">+6 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Compromised Service:</span>
                <span className="text-destructive font-semibold">-6 pts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-card border-border rounded-lg border p-2 shadow-lg">
            <p className="text-muted-foreground text-xs">
              {isMobile ? 'Pinch to zoom • Drag to pan' : 'Scroll to zoom • Drag to pan'}
            </p>
          </div>
        </div>

        <div className="bg-card h-full w-full rounded-lg">
          <svg
            ref={svgRef}
            role="img"
            aria-label="Live attack-defense network graph"
            className={`bg-background border-border h-full w-full rounded border ${
              isMobile ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          />
        </div>
      </div>
    </main>
  );
}
