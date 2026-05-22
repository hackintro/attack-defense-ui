import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type ServiceHealthBreakdown,
  type StatusData,
  type TeamData,
  type TeamHealthSnapshot,
  computeAllTeamsHealth,
  computeCumulativeScores,
} from '@/lib/scoring';
import { readHslToken, useIsDark } from '@/lib/theme';
import * as d3 from 'd3';
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Info, X } from 'lucide-react';
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

export default function AttackDefenseCTFGraph({ onDataUpdate }: AttackDefenseCTFGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const WINDOWS_PER_PAGE = isMobile ? 5 : 10;

  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [windowPage, setWindowPage] = useState(0);
  const isDark = useIsDark();

  const [filterOpen, setFilterOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [filterSrc, setFilterSrc] = useState('');
  const [filterDst, setFilterDst] = useState('');
  const [filterServices, setFilterServices] = useState<string[]>([]);

  // Custom HP-area tooltip. The SVG native `<title>` flickered because
  // animated attack dots fly through the HP region and steal hover focus.
  // We track which team is hovered in React state and render a themed
  // overlay tooltip outside the SVG so it stays stable regardless of what's
  // animating underneath.
  const [hoveredTeam, setHoveredTeam] = useState<{
    teamId: string;
    teamName: string;
    services: ServiceHealthBreakdown[];
    x: number;
    y: number;
  } | null>(null);

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

  // "HP" per team for the active window (mean(uptime × patch_score) across
  // services). Drives the per-node health bar so players can see whether
  // their patch is actually working — high uptime alone isn't enough if
  // patch_score dropped, that means real users are being locked out.
  const teamHealth = useMemo<Record<string, TeamHealthSnapshot>>(
    () => (status ? computeAllTeamsHealth(status, activeTimeWindow) : {}),
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

    // Resolve theme tokens once for SVG so labels and HP bars follow the
    // active Cyber Noir palette without re-running on every animation tick.
    const labelColor = isDark ? '#e6edf3' : '#0b1320';
    const explosionColor = readHslToken('--warning') || 'orange';
    const healthHighColor = readHslToken('--success') || '#34d399';
    const healthMidColor = readHslToken('--warning') || '#fbbf24';
    const healthLowColor = readHslToken('--destructive') || '#f43f5e';
    const healthTrackColor = readHslToken('--muted') || '#1f2a36';

    const HP_BAR_W = 60;
    const HP_BAR_H = 5;

    Object.entries(nodes).forEach(([id, node]) => {
      if (visibleTeamIds.size > 0 && !visibleTeamIds.has(id)) return;
      const { x, y, color, score } = node;

      // Per-node sub-group so the <title> tooltip is scoped to this team
      // and isn't attached to the parent container.
      const nodeG = g.append('g').attr('data-team-id', id);

      nodeG.append('circle').attr('cx', x).attr('cy', y).attr('r', 20).attr('fill', color);

      const labelOffset = 35;
      const isAbove = y < cy;
      const labelY = isAbove ? y - labelOffset : y + labelOffset;
      nodeG
        .append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .text(teams[id] + ' (' + (score || 0) + ')');

      // HP bar: aggregate (uptime × patch_score) for the active window.
      // Sits on the far side of the label from the node so it never
      // overlaps the team circle.
      const snapshot = teamHealth[id];
      if (snapshot && snapshot.services.length > 0) {
        const barX = x - HP_BAR_W / 2;
        const barY = isAbove ? labelY - 22 : labelY + 8;
        const fillWidth = Math.max(0, Math.min(1, snapshot.health)) * HP_BAR_W;
        const fillColor =
          snapshot.health >= 0.66
            ? healthHighColor
            : snapshot.health >= 0.33
              ? healthMidColor
              : healthLowColor;

        // Track
        nodeG
          .append('rect')
          .attr('x', barX)
          .attr('y', barY)
          .attr('width', HP_BAR_W)
          .attr('height', HP_BAR_H)
          .attr('rx', 2)
          .attr('fill', healthTrackColor)
          .attr('opacity', 0.7);
        // Fill
        nodeG
          .append('rect')
          .attr('x', barX)
          .attr('y', barY)
          .attr('width', fillWidth)
          .attr('height', HP_BAR_H)
          .attr('rx', 2)
          .attr('fill', fillColor);
        // Percentage label
        nodeG
          .append('text')
          .attr('x', x)
          .attr('y', isAbove ? barY - 3 : barY + HP_BAR_H + 10)
          .attr('text-anchor', 'middle')
          .attr('fill', labelColor)
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('font-family', 'system-ui, -apple-system, sans-serif')
          .text(`HP ${Math.round(snapshot.health * 100)}%`);

        // Custom hover handlers — fire mouseenter/move/leave on the whole
        // team sub-group (circle + label + HP bar + HP percentage), driving
        // a React-rendered tooltip. The attack-animation layer below has
        // `pointer-events: none`, so flying dots can't interrupt this hover
        // the way they did the native SVG <title>.
        const teamName = teams[id];
        const services = snapshot.services;
        nodeG
          .style('cursor', 'help')
          .on('mouseenter', (event: MouseEvent) => {
            setHoveredTeam({
              teamId: id,
              teamName,
              services,
              x: event.clientX,
              y: event.clientY,
            });
          })
          .on('mousemove', (event: MouseEvent) => {
            setHoveredTeam((prev) =>
              prev && prev.teamId === id ? { ...prev, x: event.clientX, y: event.clientY } : prev
            );
          })
          .on('mouseleave', () => {
            setHoveredTeam((prev) => (prev && prev.teamId === id ? null : prev));
          });
      }
    });

    // All attack animation elements live inside this sub-group so we can
    // disable pointer-events for the entire animation layer at once.
    // Without this, attack dots flying across HP bars steal hover focus
    // (which is what broke the per-team tooltip before).
    const attackLayer = g.append('g').attr('class', 'attack-layer').style('pointer-events', 'none');

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
    const MAX_ATTACKS_PER_CYCLE = 350;

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

      const path = attackLayer
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .attr('d', pathD);
      const totalLength = path.node()?.getTotalLength() || 0;

      const trail = attackLayer
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2);

      const dot = attackLayer.append('circle').attr('r', 6).attr('fill', color);

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
          const explosion = attackLayer
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
    teamHealth,
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

      <div className="relative h-[calc(100vh-200px)] w-full">
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

        <div className={`absolute z-10 ${isMobile ? 'top-2 left-2' : 'top-4 right-4'}`}>
          <div className="relative">
            <button
              onClick={() => setScoringOpen(true)}
              className={`bg-card border-border hover:bg-muted absolute top-0 ${isMobile ? 'left-0' : 'right-0'} flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border shadow-lg transition-all duration-300 ${
                scoringOpen ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
              }`}
              aria-label="Scoring system"
            >
              <Info size={18} className="text-foreground" />
            </button>
            <div
              className={`absolute top-0 ${isMobile ? 'left-0' : 'right-0'} transition-all duration-300 ${isMobile ? 'origin-top-left' : 'origin-top-right'} ${
                scoringOpen
                  ? 'pointer-events-auto scale-100 opacity-100'
                  : 'pointer-events-none scale-75 opacity-0'
              }`}
            >
              <div
                className={`bg-card border-border rounded-lg border p-3 shadow-lg ${isMobile ? 'w-52' : 'w-64'}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-foreground text-sm font-semibold">Scoring System</h3>
                  <button
                    onClick={() => setScoringOpen(false)}
                    className="bg-card border-border hover:bg-muted flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border"
                    aria-label="Close scoring"
                  >
                    <X size={14} className="text-foreground" />
                  </button>
                </div>
                <div className="text-muted-foreground space-y-1 pb-2 text-xs">
                  <div className="flex justify-between">
                    <span>Operational Service:</span>
                    <span className="text-success font-semibold">
                      +42 pts (scaled by patch diff)
                    </span>
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
                <ScoringMoreInfo />
              </div>
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
            className={`bg-background border-border h-full w-full rounded border ${
              isMobile ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          />
        </div>

        {hoveredTeam && (
          <TeamHealthTooltip
            teamName={hoveredTeam.teamName}
            services={hoveredTeam.services}
            window={activeTimeWindow}
            x={hoveredTeam.x}
            y={hoveredTeam.y}
          />
        )}
      </div>
    </main>
  );
}

function ScoringMoreInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border border-t pt-2">
      <div
        className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="text-muted-foreground pb-2 text-xs">
            <div className="text-foreground mb-1 font-semibold">Team HP</div>
            <div>
              Average <span className="text-foreground">uptime × patch effectiveness</span> across
              the team&apos;s services this window. Unpatched services count as fully functional —
              HP only drops when uptime is bad or a deployed patch is breaking real users. Hover a
              team for the per-service breakdown.
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1 pt-1 text-xs"
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-500 ${open ? 'rotate-180' : ''}`}
        />
        <span>{open ? 'Less info' : 'More info'}</span>
      </button>
    </div>
  );
}

interface TeamHealthTooltipProps {
  teamName: string;
  services: ServiceHealthBreakdown[];
  window: number | null;
  x: number;
  y: number;
}

/**
 * Themed hover-card for a team's per-service health. Positioned at the
 * cursor (with viewport-edge clamping). `pointer-events: none` so the card
 * never captures the cursor — moving across it triggers the SVG underneath
 * to handle mouseleave naturally.
 */
function TeamHealthTooltip({ teamName, services, window: tw, x, y }: TeamHealthTooltipProps) {
  const cardWidth = 280;
  const estimatedHeight = 56 + services.length * 22;
  const left = Math.min(Math.max(8, x + 14), window.innerWidth - cardWidth - 8);
  const top = Math.min(Math.max(8, y + 14), window.innerHeight - estimatedHeight - 8);

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left, top, width: cardWidth }}
      role="tooltip"
    >
      <div className="bg-card border-border rounded-lg border p-3 shadow-xl">
        <div className="border-border mb-2 flex items-center justify-between border-b pb-2">
          <span className="text-foreground text-sm font-semibold">{teamName}</span>
          {tw !== null && <span className="text-muted-foreground text-xs">window {tw}</span>}
        </div>
        <ul className="space-y-1.5">
          {services.map((s) => {
            const dotClass =
              s.health >= 0.66 ? 'bg-success' : s.health >= 0.33 ? 'bg-warning' : 'bg-destructive';
            const upPct = Math.round(s.uptime * 100);
            const servedPct = Math.round(s.patchScore * 100);
            return (
              <li key={s.service} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                  <span className="text-foreground truncate font-medium">{s.service}</span>
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {upPct}% up · {s.patched ? `patch ${servedPct}%` : 'vanilla'}
                  {!s.on && <span className="text-destructive ml-1 font-semibold">· DOWN</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
