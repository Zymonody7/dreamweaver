import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Dream } from '../types';

interface DreamGraphProps {
  dreams: Dream[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  type: string;
  val: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

const DreamGraph: React.FC<DreamGraphProps> = ({ dreams }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dreams.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 500;

    const nodesMap = new Map<string, Node>();
    const linksMap = new Map<string, Link>();

    dreams.forEach(dream => {
      if (!dream.analysis?.symbols) return;
      const dreamNodeId = `dream-${dream.id}`;
      if (!nodesMap.has(dreamNodeId)) {
        nodesMap.set(dreamNodeId, { id: dreamNodeId, group: 1, type: 'dream', val: 5 });
      }

      dream.analysis.symbols.forEach(symbol => {
        const symbolId = symbol.name.toLowerCase();
        if (!nodesMap.has(symbolId)) {
          nodesMap.set(symbolId, { id: symbolId, group: 2, type: symbol.type, val: 3 });
        }
        const linkId = `${dreamNodeId}-${symbolId}`;
        linksMap.set(linkId, { source: dreamNodeId, target: symbolId, value: 1 });
      });
    });

    const nodes = Array.from(nodesMap.values());
    const links = Array.from(linksMap.values());

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Add a glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(20));

    const link = svg.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.type === 'dream' ? 6 : 4)
      .attr("fill", (d) => {
        if (d.type === 'dream') return '#60a5fa'; 
        if (d.type === 'person') return '#f472b6'; 
        if (d.type === 'object') return '#fbbf24'; 
        if (d.type === 'place') return '#34d399'; 
        return '#a78bfa';
      })
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5)
      .style("filter", "url(#glow)")
      .call(drag(simulation) as any);

    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.type === 'dream' ? '' : d.id)
      .attr("font-size", "10px")
      .attr("dx", 10)
      .attr("dy", 3)
      .attr("fill", "#94a3b8")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => Math.max(6, Math.min(width - 6, d.x)))
        .attr("cy", (d: any) => Math.max(6, Math.min(height - 6, d.y)));
      
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function drag(simulation: d3.Simulation<Node, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [dreams]);

  return (
    <div ref={containerRef} className="glass rounded-2xl overflow-hidden border border-white/5 relative">
      <div className="absolute top-4 left-4 z-10 flex gap-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span> Person</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Place</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Object</span>
      </div>
      <svg ref={svgRef} className="w-full h-[500px] cursor-move"></svg>
    </div>
  );
};

export default DreamGraph;