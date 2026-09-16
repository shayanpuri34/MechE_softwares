/**
 * Geometry Editor: Nodes, Beam Elements, Coordinates, CSV Import/Export
 */
import React, { useState } from 'react';
import { BeamElement, Node3D, CrossSection, Material } from '../types/engineering';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Maximize,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GeometryEditorProps {
  nodes: Node3D[];
  elements: BeamElement[];
  sections: CrossSection[];
  materials: Material[];
  selectedNodeId: number | null;
  selectedElementId: number | null;
  onSelectNode: (id: number | null) => void;
  onSelectElement: (id: number | null) => void;
  onUpdateNodes: (nodes: Node3D[]) => void;
  onUpdateElements: (elements: BeamElement[]) => void;
}

export const GeometryEditor: React.FC<GeometryEditorProps> = ({
  nodes,
  elements,
  sections,
  materials,
  selectedNodeId,
  selectedElementId,
  onSelectNode,
  onSelectElement,
  onUpdateNodes,
  onUpdateElements,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'nodes' | 'elements' | 'scale'>('nodes');
  const [nodeSearch, setNodeSearch] = useState('');
  const [elemSearch, setElemSearch] = useState('');

  // New Node Form State
  const [newNodeX, setNewNodeX] = useState<string>('0.0');
  const [newNodeY, setNewNodeY] = useState<string>('0.0');
  const [newNodeZ, setNewNodeZ] = useState<string>('0.0');
  const [newNodeName, setNewNodeName] = useState<string>('');

  // New Element Form State
  const [newElemStart, setNewElemStart] = useState<number>(nodes[0]?.id || 1);
  const [newElemEnd, setNewElemEnd] = useState<number>(nodes[1]?.id || 2);
  const [newElemSection, setNewElemSection] = useState<string>(sections[0]?.id || '');
  const [newElemMaterial, setNewElemMaterial] = useState<string>(materials[0]?.id || '');
  const [newElemName, setNewElemName] = useState<string>('');

  // Scaling Factor State
  const [scaleX, setScaleX] = useState<number>(1.0);
  const [scaleY, setScaleY] = useState<number>(1.0);
  const [scaleZ, setScaleZ] = useState<number>(1.0);

  // Add Node Handler
  const handleAddNode = () => {
    const x = parseFloat(newNodeX);
    const y = parseFloat(newNodeY);
    const z = parseFloat(newNodeZ);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;

    const maxId = nodes.reduce((max, n) => Math.max(max, n.id), 0);
    const nextId = maxId + 1;

    const newNode: Node3D = {
      id: nextId,
      name: newNodeName.trim() || `Node N${nextId}`,
      x,
      y,
      z,
      category: 'other',
    };

    onUpdateNodes([...nodes, newNode]);
    onSelectNode(nextId);
    setNewNodeName('');
  };

  // Delete Node Handler
  const handleDeleteNode = (id: number) => {
    // Remove node and any elements referencing it
    onUpdateNodes(nodes.filter((n) => n.id !== id));
    onUpdateElements(elements.filter((e) => e.nodeStart !== id && e.nodeEnd !== id));
    if (selectedNodeId === id) onSelectNode(null);
  };

  // Add Element Handler
  const handleAddElement = () => {
    if (newElemStart === newElemEnd) {
      alert('Start and End nodes must be distinct.');
      return;
    }

    const maxId = elements.reduce((max, e) => Math.max(max, e.id), 0);
    const nextId = maxId + 1;

    const newElem: BeamElement = {
      id: nextId,
      name: newElemName.trim() || `Member E${nextId}`,
      nodeStart: newElemStart,
      nodeEnd: newElemEnd,
      sectionId: newElemSection || sections[0].id,
      materialId: newElemMaterial || materials[0].id,
      category: 'bracing',
    };

    onUpdateElements([...elements, newElem]);
    onSelectElement(nextId);
    setNewElemName('');
  };

  // Delete Element Handler
  const handleDeleteElement = (id: number) => {
    onUpdateElements(elements.filter((e) => e.id !== id));
    if (selectedElementId === id) onSelectElement(null);
  };

  // CSV Export
  const exportNodesCSV = () => {
    let csv = 'id,name,x,y,z,isSuspensionPickup,category\n';
    nodes.forEach((n) => {
      csv += `${n.id},"${n.name || ''}",${n.x},${n.y},${n.z},${!!n.isSuspensionPickup},${n.category || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsae_chassis_nodes.csv';
    a.click();
  };

  const exportElementsCSV = () => {
    let csv = 'id,name,nodeStart,nodeEnd,sectionId,materialId,category\n';
    elements.forEach((e) => {
      csv += `${e.id},"${e.name || ''}",${e.nodeStart},${e.nodeEnd},${e.sectionId},${e.materialId},${e.category || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsae_chassis_elements.csv';
    a.click();
  };

  // CSV Import
  const handleImportNodesCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const imported: Node3D[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 5) {
          const id = parseInt(parts[0], 10);
          const name = parts[1].replace(/"/g, '');
          const x = parseFloat(parts[2]);
          const y = parseFloat(parts[3]);
          const z = parseFloat(parts[4]);
          if (!isNaN(id) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
            imported.push({ id, name, x, y, z });
          }
        }
      }

      if (imported.length > 0) {
        onUpdateNodes(imported);
      }
    };
    reader.readAsText(file);
  };

  // Scale Geometry
  const applyScale = () => {
    if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0) return;
    const scaled = nodes.map((n) => ({
      ...n,
      x: Number((n.x * scaleX).toFixed(4)),
      y: Number((n.y * scaleY).toFixed(4)),
      z: Number((n.z * scaleZ).toFixed(4)),
    }));
    onUpdateNodes(scaled);
    setScaleX(1.0);
    setScaleY(1.0);
    setScaleZ(1.0);
  };

  const filteredNodes = nodes.filter(
    (n) =>
      n.id.toString().includes(nodeSearch) ||
      (n.name && n.name.toLowerCase().includes(nodeSearch.toLowerCase())) ||
      (n.category && n.category.toLowerCase().includes(nodeSearch.toLowerCase()))
  );

  const filteredElements = elements.filter(
    (e) =>
      e.id.toString().includes(elemSearch) ||
      (e.name && e.name.toLowerCase().includes(elemSearch.toLowerCase())) ||
      `n${e.nodeStart}-n${e.nodeEnd}`.includes(elemSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sub-Tabs & Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('nodes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'nodes'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Chassis Nodes ({nodes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('elements')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'elements'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Beam Elements ({elements.length})
          </button>
          <button
            onClick={() => setActiveSubTab('scale')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'scale'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Parametric Dimension Scaler
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'nodes' && (
            <>
              <button
                onClick={exportNodesCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
                title="Export Nodes CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <label className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportNodesCSV}
                  className="hidden"
                />
              </label>
            </>
          )}

          {activeSubTab === 'elements' && (
            <button
              onClick={exportElementsCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
              title="Export Elements CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Nodes Editor */}
      {activeSubTab === 'nodes' && (
        <div className="space-y-4">
          {/* Add Node Inline Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Roll Hoop Apex"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">X Coord (m)</label>
              <input
                type="number"
                step="0.01"
                value={newNodeX}
                onChange={(e) => setNewNodeX(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Y Coord (m)</label>
              <input
                type="number"
                step="0.01"
                value={newNodeY}
                onChange={(e) => setNewNodeY(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Z Coord (m)</label>
              <input
                type="number"
                step="0.01"
                value={newNodeZ}
                onChange={(e) => setNewNodeZ(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
          </div>

          {/* Nodes Search & Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter nodes by ID, name, or category..."
                  value={nodeSearch}
                  onChange={(e) => setNodeSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none w-64 font-mono-code"
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredNodes.length} of {nodes.length} nodes
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Node</th>
                    <th className="py-2.5 px-3">Name / Label</th>
                    <th className="py-2.5 px-3 text-right">X (m)</th>
                    <th className="py-2.5 px-3 text-right">Y (m)</th>
                    <th className="py-2.5 px-3 text-right">Z (m)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-code">
                  {filteredNodes.map((node) => {
                    const isSelected = node.id === selectedNodeId;
                    return (
                      <tr
                        key={node.id}
                        onClick={() => onSelectNode(isSelected ? null : node.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-950/50 text-cyan-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-cyan-400">N{node.id}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">
                          {node.name || '—'}
                          {node.isSuspensionPickup && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800">
                              Pickup
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{node.x.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right">{node.y.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right">{node.z.toFixed(3)}</td>
                        <td className="py-2 px-3 text-slate-400 font-sans capitalize">
                          {node.category?.replace('_', ' ') || 'structure'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Delete Node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Elements Editor */}
      {activeSubTab === 'elements' && (
        <div className="space-y-4">
          {/* Add Element Inline Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Member Name</label>
              <input
                type="text"
                placeholder="e.g. Side Brace Diag"
                value={newElemName}
                onChange={(e) => setNewElemName(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Start Node</label>
              <select
                value={newElemStart}
                onChange={(e) => setNewElemStart(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    N{n.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">End Node</label>
              <select
                value={newElemEnd}
                onChange={(e) => setNewElemEnd(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    N{n.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Tube Section</label>
              <select
                value={newElemSection}
                onChange={(e) => setNewElemSection(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Material</label>
              <select
                value={newElemMaterial}
                onChange={(e) => setNewElemMaterial(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.split(' ')[0]} {m.name.split(' ')[1] || ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddElement}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          {/* Elements Search & Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter elements by ID, name, or node connectivity..."
                  value={elemSearch}
                  onChange={(e) => setElemSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none w-64 font-mono-code"
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredElements.length} of {elements.length} elements
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Element</th>
                    <th className="py-2.5 px-3">Name / Label</th>
                    <th className="py-2.5 px-3">Connectivity</th>
                    <th className="py-2.5 px-3">Section Profile</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-code">
                  {filteredElements.map((elem) => {
                    const isSelected = elem.id === selectedElementId;
                    const sec = sections.find((s) => s.id === elem.sectionId);
                    return (
                      <tr
                        key={elem.id}
                        onClick={() => onSelectElement(isSelected ? null : elem.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-950/50 text-cyan-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-cyan-400">E{elem.id}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{elem.name || '—'}</td>
                        <td className="py-2 px-3 text-cyan-300">
                          N{elem.nodeStart} → N{elem.nodeEnd}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-[200px]">
                          {sec?.name || elem.sectionId}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans capitalize">
                          {elem.category?.replace('_', ' ') || 'structure'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(elem.id);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Delete Element"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Parametric Scaler */}
      {activeSubTab === 'scale' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 max-w-xl space-y-4">
          <div className="flex items-center gap-2">
            <Maximize className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Chassis Global Dimension Scaling</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multiplicatively scale node coordinates along longitudinal (X), lateral (Y), or vertical (Z)
            axes to study the structural effects of increasing wheelbase, track width, or cockpit height.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">X Scale (Length)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={scaleX}
                onChange={(e) => setScaleX(parseFloat(e.target.value) || 1.0)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Y Scale (Width / Track)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={scaleY}
                onChange={(e) => setScaleY(parseFloat(e.target.value) || 1.0)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Z Scale (Height)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={scaleZ}
                onChange={(e) => setScaleZ(parseFloat(e.target.value) || 1.0)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
              />
            </div>
          </div>

          <button
            onClick={applyScale}
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow transition mt-2"
          >
            Apply Dimension Scaling
          </button>
        </div>
      )}
    </div>
  );
};
