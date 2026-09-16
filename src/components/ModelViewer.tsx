/**
 * Interactive 3D Canvas FEA Model Viewport
 *
 * Features:
 * - 3D Orbit, Pan, and Zoom with high frame-rate rendering
 * - Undeformed wireframe & Deformed shape overlays
 * - Multi-field color contours (Stress, Factor of Safety, Axial Force Tension/Compression, Displacement)
 * - Load vector arrows & Boundary condition glyphs
 * - Interactive node & element selection with instant HUD telemetry
 * - Deformation exaggeration scale multiplier (1x to 500x)
 * - Preset CAD camera views (Isometric, Top, Front, Side)
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  BeamElement,
  BoundaryCondition,
  FEAResult,
  NodalLoad,
  Node3D,
  Vector3D,
} from '../types/engineering';
import {
  RotateCcw,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Compass,
  Sliders,
  Info,
} from 'lucide-react';

export type DisplayField = 'stress' | 'fos' | 'axial_force' | 'displacement' | 'none';

interface ModelViewerProps {
  nodes: Node3D[];
  elements: BeamElement[];
  feaResult: FEAResult | null;
  loads: NodalLoad[];
  boundaryConditions: BoundaryCondition[];
  selectedElementId: number | null;
  selectedNodeId: number | null;
  onSelectElement: (id: number | null) => void;
  onSelectNode: (id: number | null) => void;
  activeLoadCaseName?: string;
}

// Color map: Rainbow / Turbo ramp for FEA contours
function getContourColor(val: number, min: number, max: number): string {
  if (max <= min) return '#06b6d4'; // cyan fallback
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));

  // 5-stop smooth engineering color gradient: Blue -> Cyan -> Green -> Yellow -> Red
  let r = 0, g = 0, b = 0;
  if (t < 0.25) {
    const s = t / 0.25;
    r = 0;
    g = Math.round(255 * s);
    b = 255;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = 0;
    g = 255;
    b = Math.round(255 * (1 - s));
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = Math.round(255 * s);
    g = 255;
    b = 0;
  } else {
    const s = (t - 0.75) / 0.25;
    r = 255;
    g = Math.round(255 * (1 - s));
    b = 0;
  }

  return `rgb(${r},${g},${b})`;
}

// Factor of safety color: Red (< 1.5), Yellow (1.5 - 2.5), Green (> 2.5)
function getFosColor(fos: number): string {
  if (fos < 1.2) return '#ef4444'; // Red
  if (fos < 1.8) return '#f97316'; // Orange
  if (fos < 2.5) return '#eab308'; // Yellow
  if (fos < 4.0) return '#84cc16'; // Light Green
  return '#10b981'; // Emerald Green
}

// Axial force color: Red = Tension (+), Blue = Compression (-)
function getAxialColor(axialForceN: number, maxMag: number): string {
  if (maxMag <= 0) return '#94a3b8';
  const ratio = Math.max(-1, Math.min(1, axialForceN / maxMag));
  if (ratio > 0) {
    // Tension (Red)
    const intensity = Math.round(150 + 105 * ratio);
    return `rgb(${intensity}, 68, 68)`;
  } else {
    // Compression (Blue)
    const intensity = Math.round(150 + 105 * Math.abs(ratio));
    return `rgb(59, 130, ${intensity})`;
  }
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  nodes,
  elements,
  feaResult,
  loads,
  boundaryConditions,
  selectedElementId,
  selectedNodeId,
  onSelectElement,
  onSelectNode,
  activeLoadCaseName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View state: Camera angles & scale
  const [rotX, setRotX] = useState<number>(-25); // degrees
  const [rotZ, setRotZ] = useState<number>(45); // degrees
  const [zoom, setZoom] = useState<number>(240); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 30 });
  const [deformScale, setDeformScale] = useState<number>(50); // visual multiplier

  // Display toggles
  const [showUndeformed, setShowUndeformed] = useState<boolean>(true);
  const [showDeformed, setShowDeformed] = useState<boolean>(true);
  const [displayField, setDisplayField] = useState<DisplayField>('stress');
  const [showNodes, setShowNodes] = useState<boolean>(true);
  const [showNodeIds, setShowNodeIds] = useState<boolean>(false);
  const [showElementIds, setShowElementIds] = useState<boolean>(false);
  const [showLoads, setShowLoads] = useState<boolean>(true);
  const [showSupports, setShowSupports] = useState<boolean>(true);

  // Interaction tracking
  const isDragging = useRef<boolean>(false);
  const isPanning = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate geometric centroid of chassis for camera centering
  const centroid = useMemo(() => {
    if (nodes.length === 0) return { x: 0, y: 0, z: 0 };
    let sx = 0, sy = 0, sz = 0;
    for (const n of nodes) {
      sx += n.x;
      sy += n.y;
      sz += n.z;
    }
    return { x: sx / nodes.length, y: sy / nodes.length, z: sz / nodes.length };
  }, [nodes]);

  // Max field values for contours
  const contourExtremes = useMemo(() => {
    if (!feaResult) return { minStress: 0, maxStress: 100, maxAxial: 1000, maxDisp: 1 };

    let maxStress = 0;
    let maxAxial = 0;
    feaResult.elementResults.forEach((res) => {
      const s = res.vonMisesStress / 1e6; // MPa
      if (s > maxStress) maxStress = s;
      const ax = Math.abs(res.axialForce);
      if (ax > maxAxial) maxAxial = ax;
    });

    return {
      minStress: 0,
      maxStress: Math.max(maxStress, 1.0),
      maxAxial: Math.max(maxAxial, 100),
      maxDisp: Math.max(feaResult.maxDisplacementMm, 0.01),
    };
  }, [feaResult]);

  // 3D Projection transform
  const project3D = useCallback(
    (point: Vector3D, width: number, height: number): { x: number; y: number; depth: number } => {
      // 1. Shift to centroid
      const dx = point.x - centroid.x;
      const dy = point.y - centroid.y;
      const dz = point.z - centroid.z;

      // 2. Rotate about Z (yaw)
      const radZ = (rotZ * Math.PI) / 180;
      const cosZ = Math.cos(radZ);
      const sinZ = Math.sin(radZ);
      const x1 = dx * cosZ - dy * sinZ;
      const y1 = dx * sinZ + dy * cosZ;
      const z1 = dz;

      // 3. Rotate about X (pitch)
      const radX = (rotX * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // 4. Project onto 2D viewport
      const screenX = width / 2 + pan.x + x2 * zoom;
      const screenY = height / 2 + pan.y - z2 * zoom; // Y is up on screen

      return { x: screenX, y: screenY, depth: y2 };
    },
    [centroid, rotX, rotZ, zoom, pan]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background: Engineering deep slate
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Draw Subtle Floor Grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    const gridSpacing = 0.5; // 0.5 m
    const gridHalf = 1.5; // 3x3 m grid
    for (let gx = -gridHalf; gx <= gridHalf; gx += gridSpacing) {
      const p1 = project3D({ x: centroid.x + gx, y: centroid.y - gridHalf, z: 0 }, width, height);
      const p2 = project3D({ x: centroid.x + gx, y: centroid.y + gridHalf, z: 0 }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gy = -gridHalf; gy <= gridHalf; gy += gridSpacing) {
      const p1 = project3D({ x: centroid.x - gridHalf, y: centroid.y + gy, z: 0 }, width, height);
      const p2 = project3D({ x: centroid.x + gridHalf, y: centroid.y + gy, z: 0 }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    const nodeMap = new Map<number, Node3D>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    // Map deformed coordinates if FEA result exists
    const deformedNodeMap = new Map<number, Vector3D>();
    nodes.forEach((n) => {
      const disp = feaResult?.nodeDisplacements?.get(n.id);
      if (disp && showDeformed) {
        deformedNodeMap.set(n.id, {
          x: n.x + disp.ux * deformScale,
          y: n.y + disp.uy * deformScale,
          z: n.z + disp.uz * deformScale,
        });
      } else {
        deformedNodeMap.set(n.id, { x: n.x, y: n.y, z: n.z });
      }
    });

    // 1. Draw Undeformed Wireframe (subtle ghost reference)
    if (showUndeformed && feaResult && showDeformed) {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (const elem of elements) {
        const n1 = nodeMap.get(elem.nodeStart);
        const n2 = nodeMap.get(elem.nodeEnd);
        if (!n1 || !n2) continue;

        const p1 = project3D(n1, width, height);
        const p2 = project3D(n2, width, height);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 2. Sort and Draw Elements (Deformed or Baseline)
    // Depth sort elements back-to-front
    const elementRenderList = elements.map((elem) => {
      const n1Coord = deformedNodeMap.get(elem.nodeStart)!;
      const n2Coord = deformedNodeMap.get(elem.nodeEnd)!;
      const p1 = project3D(n1Coord, width, height);
      const p2 = project3D(n2Coord, width, height);
      const avgDepth = (p1.depth + p2.depth) / 2;
      return { elem, p1, p2, avgDepth, n1Coord, n2Coord };
    });

    elementRenderList.sort((a, b) => b.avgDepth - a.avgDepth);

    for (const item of elementRenderList) {
      const elem = item.elem;
      const isSelected = elem.id === selectedElementId;
      const elemResult = feaResult?.elementResults?.get(elem.id);

      // Determine stroke color
      let strokeColor = '#38bdf8'; // default sky blue
      let lineWidth = isSelected ? 4.5 : 2.5;

      if (elemResult && displayField !== 'none') {
        if (displayField === 'stress') {
          const sMpa = elemResult.vonMisesStress / 1e6;
          strokeColor = getContourColor(sMpa, contourExtremes.minStress, contourExtremes.maxStress);
        } else if (displayField === 'fos') {
          strokeColor = getFosColor(elemResult.factorOfSafety);
        } else if (displayField === 'axial_force') {
          strokeColor = getAxialColor(elemResult.axialForce, contourExtremes.maxAxial);
        } else if (displayField === 'displacement') {
          const disp1 = feaResult?.nodeDisplacements?.get(elem.nodeStart)?.totalDisp || 0;
          const disp2 = feaResult?.nodeDisplacements?.get(elem.nodeEnd)?.totalDisp || 0;
          const avgDispMm = ((disp1 + disp2) / 2) * 1000;
          strokeColor = getContourColor(avgDispMm, 0, contourExtremes.maxDisp);
        }
      }

      if (isSelected) {
        // Glowing halo for selected element
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(item.p1.x, item.p1.y);
        ctx.lineTo(item.p2.x, item.p2.y);
        ctx.stroke();
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(item.p1.x, item.p1.y);
      ctx.lineTo(item.p2.x, item.p2.y);
      ctx.stroke();

      // Draw Element ID label
      if (showElementIds) {
        const midX = (item.p1.x + item.p2.x) / 2;
        const midY = (item.p1.y + item.p2.y) / 2;
        ctx.fillStyle = isSelected ? '#fbbf24' : '#94a3b8';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`E${elem.id}`, midX + 3, midY - 3);
      }
    }

    // 3. Draw Boundary Condition Support Glyphs
    if (showSupports) {
      for (const bc of boundaryConditions) {
        const coord = deformedNodeMap.get(bc.nodeId);
        if (!coord) continue;
        const p = project3D(coord, width, height);

        // Clamped / Fixed support: Green/Cyan pyramid marker
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;

        const size = 7;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x - size, p.y + size);
        ctx.lineTo(p.x + size, p.y + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Support base line
        ctx.beginPath();
        ctx.moveTo(p.x - size - 2, p.y + size + 2);
        ctx.lineTo(p.x + size + 2, p.y + size + 2);
        ctx.stroke();
      }
    }

    // 4. Draw Applied Load Vector Arrows
    if (showLoads) {
      for (const load of loads) {
        const coord = deformedNodeMap.get(load.nodeId);
        if (!coord) continue;
        const p = project3D(coord, width, height);

        const fx = load.fx;
        const fy = load.fy;
        const fz = load.fz;
        const mag = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (mag < 1) continue;

        // Direction vector in 3D
        const arrowLenM = 0.25; // 250 mm arrow
        const startPoint: Vector3D = {
          x: coord.x - (fx / mag) * arrowLenM,
          y: coord.y - (fy / mag) * arrowLenM,
          z: coord.z - (fz / mag) * arrowLenM,
        };
        const pStart = project3D(startPoint, width, height);

        // Draw arrow shaft
        ctx.strokeStyle = '#f43f5e'; // Rose / Red
        ctx.fillStyle = '#f43f5e';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Arrow head pointing toward node p
        const angle = Math.atan2(p.y - pStart.y, p.x - pStart.x);
        const headLen = 9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(
          p.x - headLen * Math.cos(angle - Math.PI / 6),
          p.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          p.x - headLen * Math.cos(angle + Math.PI / 6),
          p.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Magnitude text
        ctx.fillStyle = '#fecdd3';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${(mag / 1000).toFixed(1)} kN`, pStart.x + 4, pStart.y - 4);
      }
    }

    // 5. Draw Node Points
    if (showNodes) {
      for (const node of nodes) {
        const coord = deformedNodeMap.get(node.id)!;
        const p = project3D(coord, width, height);
        const isSelected = node.id === selectedNodeId;

        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 6 : node.isSuspensionPickup ? 4.5 : 3, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
        } else if (node.isSuspensionPickup) {
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#cbd5e1';
          ctx.fill();
        }

        if (showNodeIds || isSelected) {
          ctx.fillStyle = isSelected ? '#fbbf24' : '#64748b';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText(`N${node.id}`, p.x + 6, p.y - 4);
        }
      }
    }

    // 6. Draw 3D Orientation Triad (HUD in bottom left)
    const triadX = 50;
    const triadY = height - 50;
    const axisLen = 30;

    const radZ = (rotZ * Math.PI) / 180;
    const radX = (rotX * Math.PI) / 180;
    const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);
    const cosX = Math.cos(radX), sinX = Math.sin(radX);

    const projectAxis = (ux: number, uy: number, uz: number) => {
      const x1 = ux * cosZ - uy * sinZ;
      const y1 = ux * sinZ + uy * cosZ;
      const x2 = x1;
      const z2 = y1 * sinX + uz * cosX;
      return { x: triadX + x2 * axisLen, y: triadY - z2 * axisLen };
    };

    // Draw X (Red - Longitudinal)
    const pX = projectAxis(1, 0, 0);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(triadX, triadY);
    ctx.lineTo(pX.x, pX.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText('X', pX.x + 3, pX.y + 3);

    // Draw Y (Green - Lateral)
    const pY = projectAxis(0, 1, 0);
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(triadX, triadY);
    ctx.lineTo(pY.x, pY.y);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillText('Y', pY.x + 3, pY.y + 3);

    // Draw Z (Blue - Vertical)
    const pZ = projectAxis(0, 0, 1);
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(triadX, triadY);
    ctx.lineTo(pZ.x, pZ.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', pZ.x + 3, pZ.y - 2);
  }, [
    nodes,
    elements,
    feaResult,
    loads,
    boundaryConditions,
    selectedElementId,
    selectedNodeId,
    rotX,
    rotZ,
    zoom,
    pan,
    deformScale,
    showUndeformed,
    showDeformed,
    displayField,
    showNodes,
    showNodeIds,
    showElementIds,
    showLoads,
    showSupports,
    centroid,
    contourExtremes,
    project3D,
  ]);

  // Mouse Interaction: Orbit, Pan, Click-to-Select
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (e.button === 2 || e.shiftKey) {
      isPanning.current = true;
    } else {
      isDragging.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (isDragging.current) {
      setRotZ((prev) => (prev + dx * 0.5) % 360);
      setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.5)));
    } else if (isPanning.current) {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If it was a quick click with minimal movement, perform node/element picking
    const moveDist = Math.hypot(
      e.clientX - lastMousePos.current.x,
      e.clientY - lastMousePos.current.y
    );

    if (moveDist < 3 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Check if clicked near a node (within 10px)
      let pickedNode: Node3D | null = null;
      let minNodeDist = 12;

      for (const node of nodes) {
        const p = project3D(node, rect.width, rect.height);
        const dist = Math.hypot(clickX - p.x, clickY - p.y);
        if (dist < minNodeDist) {
          minNodeDist = dist;
          pickedNode = node;
        }
      }

      if (pickedNode) {
        onSelectNode(pickedNode.id);
        onSelectElement(null);
        isDragging.current = false;
        isPanning.current = false;
        return;
      }

      // 2. Check if clicked near an element line (within 8px)
      const nodeMap = new Map<number, Node3D>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      let pickedElem: BeamElement | null = null;
      let minElemDist = 9;

      for (const elem of elements) {
        const n1 = nodeMap.get(elem.nodeStart);
        const n2 = nodeMap.get(elem.nodeEnd);
        if (!n1 || !n2) continue;

        const p1 = project3D(n1, rect.width, rect.height);
        const p2 = project3D(n2, rect.width, rect.height);

        // Distance from point to line segment
        const A = clickX - p1.x;
        const B = clickY - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }

        const dist = Math.hypot(clickX - xx, clickY - yy);
        if (dist < minElemDist) {
          minElemDist = dist;
          pickedElem = elem;
        }
      }

      if (pickedElem) {
        onSelectElement(pickedElem.id);
        onSelectNode(null);
      } else {
        // Deselect
        onSelectElement(null);
        onSelectNode(null);
      }
    }

    isDragging.current = false;
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(50, Math.min(1500, prev * zoomFactor)));
  };

  // Camera presets
  const setPresetView = (view: 'iso' | 'top' | 'front' | 'side') => {
    if (view === 'iso') {
      setRotX(-25);
      setRotZ(45);
    } else if (view === 'top') {
      setRotX(-90);
      setRotZ(0);
    } else if (view === 'front') {
      setRotX(0);
      setRotZ(-90);
    } else if (view === 'side') {
      setRotX(0);
      setRotZ(0);
    }
    setPan({ x: 0, y: 0 });
  };

  // Selected element or node details
  const selectedElemData = selectedElementId
    ? feaResult?.elementResults?.get(selectedElementId)
    : null;
  const selectedNodeData = selectedNodeId
    ? feaResult?.nodeDisplacements?.get(selectedNodeId)
    : null;
  const selectedNodeObj = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedElemObj = selectedElementId
    ? elements.find((e) => e.id === selectedElementId)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none"
    >
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg pointer-events-auto">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            {activeLoadCaseName || '3D Model Viewport'}
          </span>
          {feaResult && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-code font-medium bg-cyan-950 text-cyan-300 border border-cyan-800">
              SOLVED ({feaResult.executionTimeMs} ms)
            </span>
          )}
        </div>

        {/* View Controls & Display Field Picker */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 shadow-lg pointer-events-auto">
          <label className="text-[11px] text-slate-400 font-medium">Contour:</label>
          <select
            value={displayField}
            onChange={(e) => setDisplayField(e.target.value as DisplayField)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
          >
            <option value="stress">Von Mises Stress (MPa)</option>
            <option value="fos">Factor of Safety (FoS)</option>
            <option value="axial_force">Axial Force (Tension/Compression)</option>
            <option value="displacement">Total Displacement (mm)</option>
            <option value="none">Wireframe Geometry Only</option>
          </select>
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing flex-grow"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating Left Toolbar: Camera Presets & Toggles */}
      <div className="absolute top-16 left-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-lg">
        <button
          onClick={() => setPresetView('iso')}
          className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          onClick={() => setPresetView('top')}
          className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Top View (XY)"
        >
          TOP
        </button>
        <button
          onClick={() => setPresetView('front')}
          className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Front View (YZ)"
        >
          FRONT
        </button>
        <button
          onClick={() => setPresetView('side')}
          className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Side View (XZ)"
        >
          SIDE
        </button>
        <div className="w-full h-[1px] bg-slate-800 my-0.5" />
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.25, 1200))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 60))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setRotX(-25);
            setRotZ(45);
            setZoom(240);
            setPan({ x: 0, y: 30 });
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Visibility Toggles */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg pointer-events-auto">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeformed}
              onChange={(e) => setShowDeformed(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Deformed</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showUndeformed}
              onChange={(e) => setShowUndeformed(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Undeformed</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showLoads}
              onChange={(e) => setShowLoads(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Loads</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showSupports}
              onChange={(e) => setShowSupports(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Supports</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showNodes}
              onChange={(e) => setShowNodes(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Nodes</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showElementIds}
              onChange={(e) => setShowElementIds(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Elem IDs</span>
          </label>
        </div>

        {/* Deformation Exaggeration Slider */}
        {showDeformed && feaResult && (
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg pointer-events-auto">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
              Deform Scale:
            </span>
            <span className="text-xs font-mono-code text-cyan-300 font-semibold w-10">
              {deformScale}x
            </span>
            <input
              type="range"
              min={1}
              max={250}
              step={5}
              value={deformScale}
              onChange={(e) => setDeformScale(Number(e.target.value))}
              className="w-24 accent-cyan-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Floating Color Legend (Bottom Right) */}
      {feaResult && displayField !== 'none' && (
        <div className="absolute right-3 bottom-14 z-10 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 shadow-xl w-44 pointer-events-auto">
          <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex justify-between items-center">
            <span>
              {displayField === 'stress' && 'Stress (MPa)'}
              {displayField === 'fos' && 'Factor of Safety'}
              {displayField === 'axial_force' && 'Axial Force (kN)'}
              {displayField === 'displacement' && 'Total Disp (mm)'}
            </span>
          </div>

          {/* Continuous or Stepped Gradient Bar */}
          {displayField === 'stress' && (
            <div>
              <div className="h-2.5 w-full rounded bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500" />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-400 mt-1">
                <span>0.0</span>
                <span>{(contourExtremes.maxStress / 2).toFixed(1)}</span>
                <span className="text-red-400 font-semibold">{contourExtremes.maxStress.toFixed(1)}</span>
              </div>
            </div>
          )}

          {displayField === 'fos' && (
            <div>
              <div className="h-2.5 w-full rounded bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500" />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-400 mt-1">
                <span className="text-red-400 font-semibold">&lt; 1.5 (Yield)</span>
                <span>2.0</span>
                <span className="text-emerald-400 font-semibold">&gt; 3.0</span>
              </div>
            </div>
          )}

          {displayField === 'axial_force' && (
            <div>
              <div className="h-2.5 w-full rounded bg-gradient-to-r from-blue-600 via-slate-500 to-red-600" />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-400 mt-1">
                <span className="text-blue-400 font-semibold">Comp (-)</span>
                <span>0</span>
                <span className="text-red-400 font-semibold">Tension (+)</span>
              </div>
            </div>
          )}

          {displayField === 'displacement' && (
            <div>
              <div className="h-2.5 w-full rounded bg-gradient-to-r from-blue-500 via-green-500 to-red-500" />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-400 mt-1">
                <span>0.0</span>
                <span className="text-cyan-400 font-semibold">{contourExtremes.maxDisp.toFixed(2)} mm</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating HUD Inspector when an element or node is selected */}
      {(selectedElemObj || selectedNodeObj) && (
        <div className="absolute top-14 right-3 z-10 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-lg border border-cyan-800/80 shadow-2xl w-64 text-xs pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                {selectedElemObj ? `Element E${selectedElemObj.id}` : `Node N${selectedNodeObj?.id}`}
              </span>
            </div>
            <button
              onClick={() => {
                onSelectElement(null);
                onSelectNode(null);
              }}
              className="text-slate-500 hover:text-slate-300 font-bold"
            >
              &times;
            </button>
          </div>

          {selectedElemObj && (
            <div className="space-y-1.5 font-mono-code text-[11px]">
              <div className="text-slate-400 truncate">{selectedElemObj.name || 'Frame Member'}</div>
              <div className="flex justify-between text-slate-300">
                <span>Connectivity:</span>
                <span className="text-cyan-400">N{selectedElemObj.nodeStart} → N{selectedElemObj.nodeEnd}</span>
              </div>
              {selectedElemData && (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Length:</span>
                    <span>{(selectedElemData.length * 1000).toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Mass:</span>
                    <span>{(selectedElemData.mass * 1000).toFixed(1)} g</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Axial Force:</span>
                    <span className={selectedElemData.axialForce >= 0 ? 'text-red-400' : 'text-blue-400'}>
                      {(selectedElemData.axialForce / 1000).toFixed(2)} kN {selectedElemData.axialForce >= 0 ? '(T)' : '(C)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Max Bending Moment:</span>
                    <span>{selectedElemData.maxBendingMoment.toFixed(1)} N·m</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Von Mises Stress:</span>
                    <span className="text-amber-400 font-semibold">
                      {(selectedElemData.vonMisesStress / 1e6).toFixed(1)} MPa
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Factor of Safety:</span>
                    <span
                      className={`font-semibold ${
                        selectedElemData.factorOfSafety < 1.5
                          ? 'text-red-400'
                          : selectedElemData.factorOfSafety < 2.0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedElemData.factorOfSafety.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {selectedNodeObj && (
            <div className="space-y-1.5 font-mono-code text-[11px]">
              <div className="text-slate-400">{selectedNodeObj.name || 'Chassis Node'}</div>
              <div className="text-slate-300">
                Coords: [{selectedNodeObj.x.toFixed(3)}, {selectedNodeObj.y.toFixed(3)}, {selectedNodeObj.z.toFixed(3)}] m
              </div>
              {selectedNodeData && (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Disp:</span>
                    <span className="text-cyan-400 font-semibold">{(selectedNodeData.totalDisp * 1000).toFixed(3)} mm</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    ux: {(selectedNodeData.ux * 1000).toFixed(2)} | uy: {(selectedNodeData.uy * 1000).toFixed(2)} | uz: {(selectedNodeData.uz * 1000).toFixed(2)} mm
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
