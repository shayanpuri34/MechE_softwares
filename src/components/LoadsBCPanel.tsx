/**
 * Loads, Accelerations, and Boundary Conditions Panel
 */
import React, { useState } from 'react';
import { BoundaryCondition, LoadCase, NodalLoad, Node3D } from '../types/engineering';
import {
  Anchor,
  ArrowDownCircle,
  Plus,
  Trash2,
  Zap,
  Sliders,
  Check,
} from 'lucide-react';

interface LoadsBCPanelProps {
  nodes: Node3D[];
  loadCases: LoadCase[];
  activeLoadCase: LoadCase;
  onSelectLoadCase: (id: string) => void;
  onUpdateLoadCase: (updatedCase: LoadCase) => void;
  onAddLoadCase: (newCase: LoadCase) => void;
}

export const LoadsBCPanel: React.FC<LoadsBCPanelProps> = ({
  nodes,
  loadCases,
  activeLoadCase,
  onSelectLoadCase,
  onUpdateLoadCase,
  onAddLoadCase,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bcs' | 'loads'>('loads');

  // New BC Form
  const [newBcNode, setNewBcNode] = useState<number>(nodes[0]?.id || 1);
  const [fixUx, setFixUx] = useState(true);
  const [fixUy, setFixUy] = useState(true);
  const [fixUz, setFixUz] = useState(true);
  const [fixRx, setFixRx] = useState(false);
  const [fixRy, setFixRy] = useState(false);
  const [fixRz, setFixRz] = useState(false);

  // New Load Form
  const [newLoadNode, setNewLoadNode] = useState<number>(nodes[0]?.id || 1);
  const [loadFx, setLoadFx] = useState('0');
  const [loadFy, setLoadFy] = useState('0');
  const [loadFz, setLoadFz] = useState('-2500'); // N
  const [loadMx, setLoadMx] = useState('0');
  const [loadMy, setLoadMy] = useState('0');
  const [loadMz, setLoadMz] = useState('0');

  // Add BC
  const handleAddBC = () => {
    // Check if node already has a BC
    if (activeLoadCase.boundaryConditions.some((b) => b.nodeId === newBcNode)) {
      alert(`Node N${newBcNode} already has boundary conditions.`);
      return;
    }

    const newBc: BoundaryCondition = {
      nodeId: newBcNode,
      ux: fixUx,
      uy: fixUy,
      uz: fixUz,
      rx: fixRx,
      ry: fixRy,
      rz: fixRz,
      fixUx,
      fixUy,
      fixUz,
      fixRx,
      fixRy,
      fixRz,
    };

    onUpdateLoadCase({
      ...activeLoadCase,
      boundaryConditions: [...activeLoadCase.boundaryConditions, newBc],
    });
  };

  // Delete BC
  const handleDeleteBC = (nodeId: number) => {
    onUpdateLoadCase({
      ...activeLoadCase,
      boundaryConditions: activeLoadCase.boundaryConditions.filter((b) => b.nodeId !== nodeId),
    });
  };

  // Add Load
  const handleAddLoad = () => {
    const fx = parseFloat(loadFx) || 0;
    const fy = parseFloat(loadFy) || 0;
    const fz = parseFloat(loadFz) || 0;
    const mx = parseFloat(loadMx) || 0;
    const my = parseFloat(loadMy) || 0;
    const mz = parseFloat(loadMz) || 0;

    if (fx === 0 && fy === 0 && fz === 0 && mx === 0 && my === 0 && mz === 0) {
      alert('Applied load vector must have non-zero force or moment.');
      return;
    }

    const newLoad: NodalLoad = {
      nodeId: newLoadNode,
      fx,
      fy,
      fz,
      mx,
      my,
      mz,
    };

    onUpdateLoadCase({
      ...activeLoadCase,
      loads: [...activeLoadCase.loads, newLoad],
    });
  };

  // Delete Load
  const handleDeleteLoad = (index: number) => {
    const updated = [...activeLoadCase.loads];
    updated.splice(index, 1);
    onUpdateLoadCase({
      ...activeLoadCase,
      loads: updated,
    });
  };

  return (
    <div className="space-y-4">
      {/* Load Case Switcher */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 font-medium">SELECT LOAD CASE</label>
          <div className="flex flex-wrap gap-2">
            {loadCases.map((lc) => {
              const isSelected = lc.id === activeLoadCase.id;
              return (
                <button
                  key={lc.id}
                  onClick={() => onSelectLoadCase(lc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  {lc.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 font-mono-code block">
            g-Factor: <strong className="text-cyan-400">{activeLoadCase.gFactor}g</strong> | Type:{' '}
            <span className="capitalize">{activeLoadCase.type}</span>
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5 max-w-md">
            {activeLoadCase.description}
          </span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveSubTab('loads')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'loads'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Applied Forces & Moments ({activeLoadCase.loads.length})
        </button>
        <button
          onClick={() => setActiveSubTab('bcs')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'bcs'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Boundary Restraints / Supports ({activeLoadCase.boundaryConditions.length})
        </button>
      </div>

      {/* 1. Loads Tab */}
      {activeSubTab === 'loads' && (
        <div className="space-y-4">
          {/* Add Load Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Apply Nodal Force or Moment</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Target Node</label>
                <select
                  value={newLoadNode}
                  onChange={(e) => setNewLoadNode(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      N{n.id} ({n.name || 'Node'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fx Force (N)</label>
                <input
                  type="number"
                  step="100"
                  value={loadFx}
                  onChange={(e) => setLoadFx(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fy Force (N)</label>
                <input
                  type="number"
                  step="100"
                  value={loadFy}
                  onChange={(e) => setLoadFy(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fz Force (N)</label>
                <input
                  type="number"
                  step="100"
                  value={loadFz}
                  onChange={(e) => setLoadFz(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Mx (N·m)</label>
                <input
                  type="number"
                  step="50"
                  value={loadMx}
                  onChange={(e) => setLoadMx(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">My (N·m)</label>
                <input
                  type="number"
                  step="50"
                  value={loadMy}
                  onChange={(e) => setLoadMy(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <button
                onClick={handleAddLoad}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold rounded shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>

          {/* Loads Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3 font-sans">Node Name</th>
                  <th className="py-2.5 px-3 text-right">Fx (N)</th>
                  <th className="py-2.5 px-3 text-right">Fy (N)</th>
                  <th className="py-2.5 px-3 text-right">Fz (N)</th>
                  <th className="py-2.5 px-3 text-right">Resultant (kN)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-code">
                {activeLoadCase.loads.map((load, idx) => {
                  const nodeObj = nodes.find((n) => n.id === load.nodeId);
                  const mag = Math.sqrt(load.fx * load.fx + load.fy * load.fy + load.fz * load.fz);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-2 px-3 font-semibold text-rose-400">N{load.nodeId}</td>
                      <td className="py-2 px-3 font-sans text-slate-300">{nodeObj?.name || '—'}</td>
                      <td className="py-2 px-3 text-right">{load.fx.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{load.fy.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{load.fz.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right text-rose-300 font-semibold">
                        {(mag / 1000).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteLoad(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
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
      )}

      {/* 2. Boundary Conditions Tab */}
      {activeSubTab === 'bcs' && (
        <div className="space-y-4">
          {/* Add Restraint Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Degree-of-Freedom Restraint</span>
            </h3>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Target Node</label>
                <select
                  value={newBcNode}
                  onChange={(e) => setNewBcNode(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      N{n.id} ({n.name || 'Node'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixUx}
                    onChange={(e) => setFixUx(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>UX</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixUy}
                    onChange={(e) => setFixUy(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>UY</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixUz}
                    onChange={(e) => setFixUz(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>UZ</span>
                </label>
                <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixRx}
                    onChange={(e) => setFixRx(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>RX</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixRy}
                    onChange={(e) => setFixRy(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>RY</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixRz}
                    onChange={(e) => setFixRz(e.target.checked)}
                    className="rounded bg-slate-800 text-emerald-500"
                  />
                  <span>RZ</span>
                </label>
              </div>

              <button
                onClick={handleAddBC}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Restrain</span>
              </button>
            </div>
          </div>

          {/* BCs Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3 font-sans">Node Name</th>
                  <th className="py-2.5 px-3 text-center">UX</th>
                  <th className="py-2.5 px-3 text-center">UY</th>
                  <th className="py-2.5 px-3 text-center">UZ</th>
                  <th className="py-2.5 px-3 text-center">RX</th>
                  <th className="py-2.5 px-3 text-center">RY</th>
                  <th className="py-2.5 px-3 text-center">RZ</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-code">
                {activeLoadCase.boundaryConditions.map((bc) => {
                  const nodeObj = nodes.find((n) => n.id === bc.nodeId);
                  return (
                    <tr key={bc.nodeId} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-2 px-3 font-semibold text-emerald-400">N{bc.nodeId}</td>
                      <td className="py-2 px-3 font-sans text-slate-300">{nodeObj?.name || '—'}</td>
                      <td className="py-2 px-3 text-center">{bc.fixUx ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center">{bc.fixUy ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center">{bc.fixUz ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{bc.fixRx ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{bc.fixRy ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{bc.fixRz ? 'FIX' : '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteBC(bc.nodeId)}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
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
      )}
    </div>
  );
};
