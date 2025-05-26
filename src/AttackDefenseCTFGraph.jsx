import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function AttackDefenseCTFGraph() {
  const svgRef = useRef();
  // const [nodes, setNodes] = useState(null);
  const [teams, setTeams] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/status")
      .then(res => res.json())
      .then(data => {
        setTeams(data.teams);
        setStatus(data.status);
      })
      .catch(err => console.error("Failed to fetch nodes:", err));
  }, []);

  useEffect(() => {

    if (!teams) return;

    // Compute score per team
    const scores = {};
    // Every window, each team gathers 42 points for each operational service.
    // They lose 2 points for each team that hits them
    // They gain 2 points for each team they hit
    for (const teamId in status) {
      const teamStatus = status[teamId];
      for (const timeWindow in teamStatus) {
        const lastStatus = teamStatus[timeWindow];
        if (!scores[teamId]) {
          scores[teamId] = 0;
        }
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          if (serviceStatus.on) {
            scores[teamId] += 42; // Each operational service gives 42 points
            scores[teamId] += serviceStatus.teams_hit.length * 2; // Each team hit gives 2 points
          } else {
            scores[teamId] -= serviceStatus.teams_hit.length * 2; // Each team hitting them costs 2 points
          }
        }
      }
    }
    console.log("Scores:", scores);

    const width = 1000, height = 1000;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    // Define nodes and messages
    // Let's position nodes in a circular layout for better visibility
    // first compute the x,y coordinates for each node
    const cx = width / 2, cy = height / 2; // Center of the circle
    const r = height / 3; // Radius of the circle
    const team_ids = Object.keys(teams);
    const points = team_ids.map((id, i) => {
      const angle = (2 * Math.PI * i) / team_ids.length;
      return {
        id: id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      };
    });
    const nodes = {};
    points.forEach((point, i) => {
      nodes[point.id] = {
        x: point.x,
        y: point.y,
        color: d3.interpolateRainbow(i / team_ids.length), // Use a color from the category20 palette
        score: scores[point.id]
      };
    });

    // Example status message:
    // {"1":{"0":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"1":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"2":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}},"3":{"mapflix":{"on":1,"teams_hit":[2,3,4]},"powerball":{"on":1,"teams_hit":[2,3,4]},"bananananana":{"on":1,"teams_hit":[2,3,4]},"auth":{"on":1,"teams_hit":[2,3,4]},"muzac":{"on":1,"teams_hit":[2,3,4]},"pwnazon":{"on":1,"teams_hit":[2,3,4]}}},"2":{"0":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"1":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"2":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}},"3":{"mapflix":{"on":1,"teams_hit":[1,3,4]},"powerball":{"on":1,"teams_hit":[1,3,4]},"bananananana":{"on":1,"teams_hit":[1,3,4]},"auth":{"on":1,"teams_hit":[1,3,4]},"muzac":{"on":1,"teams_hit":[1,3,4]},"pwnazon":{"on":1,"teams_hit":[1,3,4]}}},"3":{"0":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"1":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"2":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}},"3":{"mapflix":{"on":1,"teams_hit":[1,2,4]},"powerball":{"on":1,"teams_hit":[1,2,4]},"bananananana":{"on":1,"teams_hit":[1,2,4]},"auth":{"on":1,"teams_hit":[1,2,4]},"muzac":{"on":1,"teams_hit":[1,2,4]},"pwnazon":{"on":1,"teams_hit":[1,2,4]}}},"4":{"0":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"1":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"2":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}},"3":{"mapflix":{"on":1,"teams_hit":[1,2,3]},"powerball":{"on":1,"teams_hit":[1,2,3]},"bananananana":{"on":1,"teams_hit":[1,2,3]},"auth":{"on":1,"teams_hit":[1,2,3]},"muzac":{"on":1,"teams_hit":[1,2,3]},"pwnazon":{"on":1,"teams_hit":[1,2,3]}}}}
    // for each team, we show the status for every time window for each service.
    // When plotting we just need to plot the status at the last time window.

    const timeWindows = Object.keys(status[1]).map((x) => parseInt(x));
    console.log(timeWindows);
    const maxTimeWindow = Math.max(...timeWindows);
    console.log(maxTimeWindow);

    const services = Object.keys(status[1][maxTimeWindow]);
    console.log("Services:", services);
    // create a map from every service to a color
    const serviceColors = d3.scaleOrdinal()
      .domain(services)
      .range(d3.schemeCategory10);

    const messages = [
    ];

    for (const teamId in status) {
      const teamStatus = status[teamId];
      const lastStatus = teamStatus[maxTimeWindow];
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

    console.log("Messages:", messages);


    console.log("Nodes:", nodes);

    // Render nodes
    Object.entries(nodes).forEach(([id, { x, y, color, score }]) => {
      svg.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 20)
        .attr("fill", color);

      svg.append("text")
        .attr("x", x)
        .attr("y", y - 30)
        .attr("text-anchor", "middle")
        .text(teams[id] + " (" + score + ")");
    });

    const sendMessage = (src, dst, color) => {
      const lineGenerator = d3.line().curve(d3.curveBasis);
      const curvePoints = [
        [src.x, src.y],
        [(src.x + dst.x) / 2 - (0.5 - Math.random()) * height / 3, (src.y + dst.y) / 2 - (0.5 - Math.random()) * height / 3],
        [dst.x, dst.y]
      ];
      const pathD = lineGenerator(curvePoints);

      const path = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "none")
        .attr("d", pathD);

      const totalLength = path.node().getTotalLength();

      const trail = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2);

      const dot = svg.append("circle")
        .attr("r", 6)
        .attr("fill", color);

      dot.transition()
        .duration(3000)
        .ease(d3.easeLinear)
        .tween("pathTween", () => {
          return function (t) {
            const point = path.node().getPointAtLength(t * totalLength);
            dot.attr("cx", point.x).attr("cy", point.y);
            const trailLength = t * totalLength;
            trail.attr("d", pathD).attr("stroke-dasharray", `${trailLength},${totalLength}`);
          };
        })
        .on("end", () => {
          // Explosion effect at destination
          const duration = 1000;
          const explosion = svg.append("circle")
            .attr("cx", dst.x)
            .attr("cy", dst.y)
            .attr("r", 0)
            .attr("fill", "orange")
            .attr("opacity", 0.3);

          explosion.transition()
            .duration(duration)
            .attr("r", 50)
            .attr("opacity", 0)
            .remove();
          dot.remove();
          trail.remove();
          path.remove();
        });
    };

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
  }, [teams, status]);

  return <svg ref={svgRef}></svg>;
}
