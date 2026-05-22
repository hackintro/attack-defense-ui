import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type StatusData,
  type TeamData,
  type TeamWindowStats,
  computeCumulativeScores,
  computeWindowStats,
} from '@/lib/scoring';
import { readHslToken, useIsDark } from '@/lib/theme';
import * as d3 from 'd3';
import { ChevronDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-background text-foreground border-border flex w-full cursor-pointer items-center justify-between rounded border px-3 py-2 text-sm"
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div
          className="bg-card border-border absolute z-50 mt-1 w-full overflow-y-auto rounded border shadow-lg"
          style={{ maxHeight: '10rem' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`hover:bg-muted w-full cursor-pointer px-3 py-2 text-left text-sm ${
                opt.value === value ? 'bg-primary/10 text-primary' : 'text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HoveredTeam {
  teamId: string;
  // anchor position in container-local coordinates
  x: number;
  y: number;
}

/**
 * Map [0, 1] patch_score to a hue between red (0) and emerald (130).
 * patch_score is the single dimension that drives the ring color — uptime and
 * attack/defense activity get separate visual channels (badge / ring) so the
 * gradient stays unambiguous.
 */
function healthColor(patchScore: number, isDark: boolean): string {
  const clamped = Math.max(0, Math.min(1, patchScore));
  const hue = clamped * 130;
  const sat = isDark ? 78 : 68;
  const light = isDark ? 48 : 47;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export default function AttackDefenseCTFGraph({ onDataUpdate }: AttackDefenseCTFGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [hovered, setHovered] = useState<HoveredTeam | null>(null);
  const WINDOWS_PER_PAGE = isMobile ? 5 : 10;

  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [windowPage, setWindowPage] = useState(0);
  const isDark = useIsDark();

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSrc, setFilterSrc] = useState('');
  const [filterDst, setFilterDst] = useState('');
  const [filterServices, setFilterServices] = useState<string[]>([]);

  const teamIds = useMemo(() => (teams ? Object.keys(teams) : []), [teams]);

  const allServices = useMemo(() => {
    if (!status) return [];
    const firstTeamId = Object.keys(status)[0];
    if (!firstTeamId) return [];
    const services = new Set<string>();
    for (const tw in status[firstTeamId]) {
      for (const svc in status[firstTeamId][tw]) {
        services.add(svc);
      }
    }
    return Array.from(services).sort();
  }, [status]);

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

  const windowStats = useMemo<Record<string, TeamWindowStats> | null>(
    () => (status && activeTimeWindow != null ? computeWindowStats(status, activeTimeWindow) : null),
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
        if (filterSrc && teamId !== filterSrc) continue;
        const teamStatus = status[teamId];
        const lastStatus = teamStatus[activeTimeWindow];
        if (!lastStatus) continue;
        for (const service in lastStatus) {
          if (filterServices.length > 0 && !filterServices.includes(service)) continue;
          const serviceStatus = lastStatus[service];
          for (const team of serviceStatus.teams_hit) {
            const team_hit_id = team.toString();
            if (filterDst && team_hit_id !== filterDst) continue;
            const color = d3.color(serviceColors(service))?.formatHex() || '#000';
            messages.push({ srcId: teamId, dstId: team_hit_id, color });
          }
        }
      }
    }

    const visibleTeamIds = new Set<string>();
    if (filterSrc || filterDst || filterServices.length > 0) {
      if (filterSrc) visibleTeamIds.add(filterSrc);
      if (filterDst) visibleTeamIds.add(filterDst);
      messages.forEach((m) => {
        visibleTeamIds.add(m.srcId);
        visibleTeamIds.add(m.dstId);
      });
    }

    // Resolve the foreground color once for SVG labels so they follow the
    // active Cyber Noir theme without re-running on every animation tick.
    const labelColor = isDark ? '#e6edf3' : '#0b1320';
    const tileBorderColor = isDark ? 'rgba(230,237,243,0.18)' : 'rgba(11,19,32,0.22)';
    const matrixBgColor = isDark ? 'rgba(15,22,32,0.55)' : 'rgba(255,255,255,0.65)';
    const explosionColor = readHslToken('--warning') || 'orange';
    const destructiveColor = readHslToken('--destructive') || '#ef4444';
    const infoColor = readHslToken('--info') || '#22d3ee';

    // Outer service-status ring. Each team gets a row of small tiles —
    // health colored, with attack/compromise annotations — placed past
    // the team label and rotated tangentially so they form a clean ring.
    const matrixServices =
      activeTimeWindow != null && firstTeamId
        ? Object.keys(status[firstTeamId][activeTimeWindow]).sort()
        : [];
    const TILE_SIZE = 11;
    const TILE_GAP = 2;
    const MATRIX_PAD_X = 6;
    const MATRIX_PAD_Y = 4;
    const matrixContentWidth =
      matrixServices.length * TILE_SIZE + Math.max(0, matrixServices.length - 1) * TILE_GAP;
    const matrixBgWidth = matrixContentWidth + MATRIX_PAD_X * 2;
    const matrixBgHeight = TILE_SIZE + MATRIX_PAD_Y * 2;
    const MATRIX_RADIUS_OFFSET = 78;

    const getContainerPoint = (event: MouseEvent): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: event.clientX, y: event.clientY };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    Object.entries(nodes).forEach(([id, node]) => {
      if (visibleTeamIds.size > 0 && !visibleTeamIds.has(id)) return;
      const { x, y, color, score } = node;

      const teamG = g
        .append('g')
        .attr('class', 'team-group')
        .style('cursor', 'pointer')
        .attr('data-team-id', id);

      // Soft halo behind the team node — adds depth without competing
      // with the live attack trails.
      teamG
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 28)
        .attr('fill', color)
        .attr('opacity', 0.18);

      teamG.append('circle').attr('cx', x).attr('cy', y).attr('r', 20).attr('fill', color);

      const labelOffset = 35;
      const labelY = y < cy ? y - labelOffset : y + labelOffset;
      teamG
        .append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .text(teams[id] + ' (' + (score || 0) + ')');

      // Service status matrix — rotated tangent to the team circle so
      // all of them line up into one continuous outer ring.
      if (matrixServices.length > 0 && windowStats) {
        const angle = Math.atan2(y - cy, x - cx);
        const mx = cx + (r + MATRIX_RADIUS_OFFSET) * Math.cos(angle);
        const my = cy + (r + MATRIX_RADIUS_OFFSET) * Math.sin(angle);
        const rotateDeg = (angle * 180) / Math.PI + 90;

        const matrixG = teamG
          .append('g')
          .attr('transform', `translate(${mx}, ${my}) rotate(${rotateDeg})`);

        // Backdrop pill so tiles read against the live trails behind them.
        matrixG
          .append('rect')
          .attr('x', -matrixBgWidth / 2)
          .attr('y', -matrixBgHeight / 2)
          .attr('width', matrixBgWidth)
          .attr('height', matrixBgHeight)
          .attr('rx', 6)
          .attr('fill', matrixBgColor)
          .attr('stroke', tileBorderColor)
          .attr('stroke-width', 1);

        const stats = windowStats[id];
        const startX = -matrixContentWidth / 2;

        matrixServices.forEach((svc, i) => {
          const sv = stats?.services[svc];
          const patchScore = sv?.patchScore ?? 0;
          const tx = startX + i * (TILE_SIZE + TILE_GAP);

          const tile = matrixG.append('g').attr('transform', `translate(${tx}, ${-TILE_SIZE / 2})`);

          // Compromised tiles get a destructive halo behind them so they
          // pop at a glance even with the global tile fill in play.
          if (sv && sv.timesCompromised > 0) {
            tile
              .append('rect')
              .attr('x', -2)
              .attr('y', -2)
              .attr('width', TILE_SIZE + 4)
              .attr('height', TILE_SIZE + 4)
              .attr('rx', 5)
              .attr('fill', 'none')
              .attr('stroke', destructiveColor)
              .attr('stroke-width', 2)
              .attr('opacity', 0.95);
          }

          tile
            .append('rect')
            .attr('width', TILE_SIZE)
            .attr('height', TILE_SIZE)
            .attr('rx', 3)
            .attr('fill', sv ? healthColor(patchScore, isDark) : 'transparent')
            .attr('stroke', tileBorderColor)
            .attr('stroke-width', 1);

          // Attacker pip — small cyan dot in the top-right corner.
          if (sv && sv.attacksLaunched > 0) {
            tile
              .append('circle')
              .attr('cx', TILE_SIZE - 3.5)
              .attr('cy', 3.5)
              .attr('r', 2.4)
              .attr('fill', infoColor)
              .attr('stroke', isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)')
              .attr('stroke-width', 0.8);
          }
        });
      }

      // Hover-to-inspect. Use mouseenter/leave so children don't re-fire
      // the handler as the cursor moves between the node and the matrix.
      const showTooltip = (event: MouseEvent) => {
        const pt = getContainerPoint(event);
        setHovered({ teamId: id, x: pt.x, y: pt.y });
      };
      const hideTooltip = () => setHovered(null);

      teamG
        .on('mouseenter', showTooltip as unknown as (event: Event) => void)
        .on('mouseleave', hideTooltip)
        .on('click', showTooltip as unknown as (event: Event) => void);
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
    const MAX_ATTACKS_PER_CYCLE = 200;

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
  }, [
    teams,
    status,
    scores,
    windowStats,
    isMobile,
    activeTimeWindow,
    isDark,
    filterSrc,
    filterDst,
    filterServices,
  ]);

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

      <div ref={containerRef} className="relative h-[calc(100vh-200px)] w-full">
        <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 left-4'} z-10`}>
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <button
                className="bg-card border-border hover:bg-muted flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border shadow-lg"
                aria-label="Toggle filters"
              >
                <Filter size={18} className="text-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-foreground mb-1 block text-sm font-medium">
                      Source Team
                    </label>
                    <FilterSelect
                      value={filterSrc}
                      onChange={setFilterSrc}
                      options={[
                        { value: '', label: 'All Teams' },
                        ...teamIds.map((id) => ({ value: id, label: teams?.[id] ?? id })),
                      ]}
                      placeholder="All Teams"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1 block text-sm font-medium">
                      Destination Team
                    </label>
                    <FilterSelect
                      value={filterDst}
                      onChange={setFilterDst}
                      options={[
                        { value: '', label: 'All Teams' },
                        ...teamIds.map((id) => ({ value: id, label: teams?.[id] ?? id })),
                      ]}
                      placeholder="All Teams"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">Services</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allServices.map((svc) => {
                      const active = filterServices.length === 0 || filterServices.includes(svc);
                      return (
                        <button
                          key={svc}
                          onClick={() =>
                            setFilterServices((prev) =>
                              prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
                            )
                          }
                          className={`cursor-pointer rounded border px-3 py-2 text-center text-sm font-medium ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div
          className={`absolute z-10 ${isMobile ? 'top-2 left-2' : 'top-4 right-4'} ${isMobile ? 'w-52' : 'w-64'}`}
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
            <div className="border-border/60 mt-3 border-t pt-2">
              <div className="text-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
                Status Ring
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <span
                      className="inline-block h-3 w-3 rounded-[3px]"
                      style={{ background: healthColor(0, isDark) }}
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-[3px]"
                      style={{ background: healthColor(0.5, isDark) }}
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-[3px]"
                      style={{ background: healthColor(1, isDark) }}
                    />
                  </div>
                  <span className="text-muted-foreground">Patch score (red = broken → green = clean)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative inline-block h-3 w-3 rounded-[3px] bg-slate-500/40">
                    <span className="bg-info absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full" />
                  </span>
                  <span className="text-muted-foreground">Cyan dot — attacking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="border-destructive inline-block h-3 w-3 rounded-[3px] border-2 bg-slate-500/40" />
                  <span className="text-muted-foreground">Red ring — being hit</span>
                </div>
              </div>
              <p className="text-muted-foreground/80 mt-2 text-[11px] italic">
                Hover a team for full window breakdown
              </p>
            </div>
          </div>
        </div>

        <div
          className={`absolute bottom-4 z-10 ${isMobile ? 'left-1/2 -translate-x-1/2' : 'left-4'}`}
        >
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
            onClick={(e) => {
              // Tapping empty canvas dismisses the inspector (mobile path).
              if (!(e.target as Element).closest('.team-group')) setHovered(null);
            }}
            className={`bg-background border-border h-full w-full rounded border ${
              isMobile ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          />
        </div>

        {hovered && teams && windowStats && (
          <TeamInspector
            teamName={teams[hovered.teamId] ?? hovered.teamId}
            teamColor={d3.interpolateRainbow(
              Math.max(0, teamIds.indexOf(hovered.teamId)) / Math.max(1, teamIds.length)
            )}
            stats={windowStats[hovered.teamId]}
            totalScore={scores[hovered.teamId] ?? 0}
            activeWindow={activeTimeWindow}
            anchor={{ x: hovered.x, y: hovered.y }}
            container={containerRef.current}
            isDark={isDark}
            onDismiss={() => setHovered(null)}
          />
        )}
      </div>
    </main>
  );
}

interface TeamInspectorProps {
  teamName: string;
  teamColor: string;
  stats: TeamWindowStats | undefined;
  totalScore: number;
  activeWindow: number | null;
  anchor: { x: number; y: number };
  container: HTMLDivElement | null;
  isDark: boolean;
  onDismiss: () => void;
}

function TeamInspector({
  teamName,
  teamColor,
  stats,
  totalScore,
  activeWindow,
  anchor,
  container,
  isDark,
  onDismiss,
}: TeamInspectorProps) {
  if (!stats) return null;
  const services = Object.entries(stats.services).sort(([a], [b]) => a.localeCompare(b));
  const defNetTotal = stats.totals.operationalPoints + stats.totals.compromisedPoints;

  // Clamp tooltip inside its container so it never bleeds off-screen.
  const TOOLTIP_W = 440;
  const ROW_H = 22;
  const TOOLTIP_H = 200 + services.length * ROW_H;
  const cw = container?.clientWidth ?? 0;
  const ch = container?.clientHeight ?? 0;
  let left = anchor.x + 18;
  let top = anchor.y + 18;
  if (cw > 0 && left + TOOLTIP_W > cw - 8) left = Math.max(8, anchor.x - TOOLTIP_W - 18);
  if (ch > 0 && top + TOOLTIP_H > ch - 8) top = Math.max(8, ch - TOOLTIP_H - 8);

  const delta = stats.totals.windowDelta;
  const deltaColor =
    delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-foreground';

  return (
    <div
      className="border-border/70 bg-card/95 absolute z-30 w-[420px] max-w-[calc(100vw-32px)] rounded-xl border p-4 text-sm shadow-2xl backdrop-blur-md"
      style={{ left, top, pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="ring-background inline-block h-3.5 w-3.5 rounded-full shadow ring-2"
          style={{ background: teamColor, boxShadow: `0 0 12px ${teamColor}` }}
        />
        <h4 className="text-foreground leading-none font-semibold">{teamName}</h4>
        <span className="text-muted-foreground ml-auto text-xs">
          Window {activeWindow ?? '—'}
        </span>
        <button
          onClick={onDismiss}
          aria-label="Close inspector"
          className="text-muted-foreground hover:text-foreground -my-1 ml-1 cursor-pointer rounded px-1 text-xs leading-none"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="border-border/60 bg-background/40 rounded-lg border px-2 py-1.5">
          <div className="text-muted-foreground text-[10px] tracking-wide uppercase">Total</div>
          <div className="text-foreground text-sm font-bold tabular-nums">
            {totalScore.toLocaleString()}
          </div>
        </div>
        <div className="border-border/60 bg-background/40 rounded-lg border px-2 py-1.5">
          <div className="text-muted-foreground text-[10px] tracking-wide uppercase">Δ window</div>
          <div className={`text-sm font-bold tabular-nums ${deltaColor}`}>
            {delta > 0 ? '+' : ''}
            {delta}
          </div>
        </div>
        <div className="border-border/60 bg-background/40 rounded-lg border px-2 py-1.5">
          <div className="text-muted-foreground text-[10px] tracking-wide uppercase">Up</div>
          <div className="text-foreground text-sm font-bold tabular-nums">
            {stats.totals.servicesUp}/{stats.totals.totalServices}
          </div>
        </div>
      </div>

      <div className="border-border/50 overflow-hidden rounded-lg border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40">
            <tr className="text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium">Service</th>
              <th
                className="px-1 py-1.5 text-right font-medium"
                title="Defense reward (42 × patch_score) — 0 if service is down"
              >
                Def
              </th>
              <th
                className="px-1 py-1.5 text-right font-medium"
                title="Flags lost to other teams this window"
              >
                Lost
              </th>
              <th
                className="px-1 py-1.5 text-right font-medium"
                title="Defense net = Def − 6 × Lost"
              >
                DefΔ
              </th>
              <th
                className="px-1 py-1.5 text-right font-medium"
                title="Flags captured from other teams this window"
              >
                Atk
              </th>
              <th
                className="px-1 py-1.5 text-right font-medium"
                title="Attack reward = 6 × Atk"
              >
                AtkΔ
              </th>
              <th
                className="px-2 py-1.5 text-right font-medium"
                title="Service total = DefΔ + AtkΔ"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map(([svc, sv]) => {
              const defNet = sv.operationalPoints + sv.compromisedPoints;
              const atkCount = sv.attacksLaunched;
              const atkPts = sv.attackPoints;
              const lost = sv.timesCompromised;
              const total = sv.subtotal;
              return (
                <tr key={svc} className="border-border/30 border-t">
                  <td className="px-2 py-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-[2px]"
                        style={{ background: healthColor(sv.patchScore, isDark) }}
                        title={`patch_score = ${sv.patchScore.toFixed(2)}`}
                      />
                      <span className="text-foreground">{svc}</span>
                      <span
                        className="text-[10px] tabular-nums"
                        style={{ color: healthColor(sv.patchScore, isDark) }}
                        title="patch_score"
                      >
                        {sv.patchScore.toFixed(2)}
                      </span>
                      {sv.uptime < 0.5 && (
                        <span className="text-destructive text-[9px] font-bold tracking-wider uppercase">
                          down
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    className={`px-1 py-1 text-right tabular-nums ${
                      sv.operationalPoints > 0 ? 'text-success' : 'text-muted-foreground'
                    }`}
                  >
                    {sv.operationalPoints > 0 ? `+${sv.operationalPoints}` : '0'}
                  </td>
                  <td
                    className={`px-1 py-1 text-right tabular-nums ${
                      lost > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {lost}
                  </td>
                  <td
                    className={`px-1 py-1 text-right tabular-nums ${
                      defNet > 0
                        ? 'text-success'
                        : defNet < 0
                          ? 'text-destructive'
                          : 'text-foreground'
                    }`}
                  >
                    {defNet > 0 ? '+' : ''}
                    {defNet}
                  </td>
                  <td
                    className={`px-1 py-1 text-right tabular-nums ${
                      atkCount > 0 ? 'text-info font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {atkCount}
                  </td>
                  <td
                    className={`px-1 py-1 text-right tabular-nums ${
                      atkPts > 0 ? 'text-info' : 'text-muted-foreground'
                    }`}
                  >
                    {atkPts > 0 ? `+${atkPts}` : '0'}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-semibold tabular-nums ${
                      total > 0
                        ? 'text-success'
                        : total < 0
                          ? 'text-destructive'
                          : 'text-foreground'
                    }`}
                  >
                    {total > 0 ? '+' : ''}
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-border/60 bg-muted/40 border-t-2 font-semibold">
              <td className="text-foreground px-2 py-1.5 text-[10px] tracking-wider uppercase">
                Window
              </td>
              <td className="text-success px-1 py-1.5 text-right tabular-nums">
                {stats.totals.operationalPoints > 0
                  ? `+${stats.totals.operationalPoints}`
                  : '0'}
              </td>
              <td
                className={`px-1 py-1.5 text-right tabular-nums ${
                  stats.totals.timesCompromised > 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {stats.totals.timesCompromised}
              </td>
              <td
                className={`px-1 py-1.5 text-right tabular-nums ${
                  defNetTotal > 0
                    ? 'text-success'
                    : defNetTotal < 0
                      ? 'text-destructive'
                      : 'text-foreground'
                }`}
              >
                {defNetTotal > 0 ? '+' : ''}
                {defNetTotal}
              </td>
              <td
                className={`px-1 py-1.5 text-right tabular-nums ${
                  stats.totals.attacksLaunched > 0 ? 'text-info' : 'text-muted-foreground'
                }`}
              >
                {stats.totals.attacksLaunched}
              </td>
              <td
                className={`px-1 py-1.5 text-right tabular-nums ${
                  stats.totals.attackPoints > 0 ? 'text-info' : 'text-muted-foreground'
                }`}
              >
                {stats.totals.attackPoints > 0 ? `+${stats.totals.attackPoints}` : '0'}
              </td>
              <td
                className={`px-2 py-1.5 text-right tabular-nums ${
                  stats.totals.windowDelta > 0
                    ? 'text-success'
                    : stats.totals.windowDelta < 0
                      ? 'text-destructive'
                      : 'text-foreground'
                }`}
              >
                {stats.totals.windowDelta > 0 ? '+' : ''}
                {stats.totals.windowDelta}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
