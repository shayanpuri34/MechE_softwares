/**
 * FEA Results & Structural Analysis Inspector Panel
 */
import React, { useState } from 'react';
import { BeamElement, FEAResult, Node3D } from '../types/engineering';
import {
  Table,
  Download,
  AlertOctagon,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface ResultsPanelProps {
  nodes: Node3D[];
  elements: BeamElement[];
  feaResult: FEAResult | null;
  selectedElementId: number | null;
  selectedNodeId: number | null;
  onSelectElement: (id: number | null) => void;
  onSelectNode: (id: number | null) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  nodes,
  elements,
  feaResult,
  selectedElementId,
  selectedNodeId,
  onSelectElement,
  onSelectNode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'displacements' | 'forces'>('members');
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'stress' | 'fos' | 'axial'>('stress');

  if (!feaResult) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center">
        <AlertOctagon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No FEA Results Available</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Execute the 3D frame element solver by clicking the "RUN FEA" button to populate stress and
          deformation telemetry.
        </p>
      </div>
    );
  }

  // Member results array
  const memberList = elements.map((elem) => {
    const res = feaResult.elementResults.get(elem.id);
    return {
      elem,
      res,
    };
  });

  // Filter & Sort
  const filteredMembers = memberList
    .filter(({ elem }) => {
      const q = filterText.toLowerCase();
      return (
        elem.id.toString().includes(q) ||
        (elem.name && elem.name.toLowerCase().includes(q)) ||
        (elem.category && elem.category.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (!a.res || !b.res) return 0;
      if (sortBy === 'stress') return b.res.vonMisesStress - a.res.vonMisesStress;
      if (sortBy === 'fos') return a.res.factorOfSafety - b.res.factorOfSafety;
      if (sortBy === 'axial') return Math.abs(b.res.axialForce) - Math.abs(a.res.axialForce);
      return 0;
    });

  // Export Results CSV
  const exportResultsCSV = () => {
    let csv = 'elementId,name,category,length_m,mass_kg,axialForce_N,bendingMoment_Nm,vonMisesStress_MPa,FoS\n';
    memberList.forEach(({ elem, res }) => {
      if (!res) return;
      csv += `${elem.id},"${elem.name || ''}","${elem.category || ''}",${res.length.toFixed(3)},${res.mass.toFixed(3)},${res.axialForce.toFixed(1)},${res.maxBendingMoment.toFixed(1)},${(res.vonMisesStress / 1e6).toFixed(2)},${res.factorOfSafety.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsae_fea_member_results.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'members'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Critical Member Ranking ({elements.length})
          </button>
          <button
            onClick={() => setActiveSubTab('displacements')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'displacements'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Nodal Displacements ({nodes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('forces')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'forces'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Element Internal Forces
          </button>
        </div>

        <button
          onClick={exportResultsCSV}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Results CSV</span>
        </button>
      </div>

      {/* 1. Members Ranking */}
      {activeSubTab === 'members' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search member name or ID..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-56 font-mono-code"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none font-mono-code"
              >
                <option value="stress">Highest Stress (MPa)</option>
                <option value="fos">Lowest Factor of Safety</option>
                <option value="axial">Highest Axial Force (kN)</option>
              </select>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 font-sans">Name</th>
                  <th className="py-2.5 px-3">Nodes</th>
                  <th className="py-2.5 px-3 text-right">Length (mm)</th>
                  <th className="py-2.5 px-3 text-right">Axial Force (kN)</th>
                  <th className="py-2.5 px-3 text-right">Bending (N·m)</th>
                  <th className="py-2.5 px-3 text-right">Von Mises (MPa)</th>
                  <th className="py-2.5 px-3 text-right">Factor of Safety</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-code">
                {filteredMembers.map(({ elem, res }) => {
                  if (!res) return null;
                  const isSelected = elem.id === selectedElementId;
                  const sMpa = res.vonMisesStress / 1e6;
                  const fos = res.factorOfSafety;

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
                      <td className="py-2 px-3 font-sans text-slate-200">{elem.name || '—'}</td>
                      <td className="py-2 px-3 text-slate-400">
                        N{elem.nodeStart} → N{elem.nodeEnd}
                      </td>
                      <td className="py-2 px-3 text-right">{(res.length * 1000).toFixed(0)}</td>
                      <td
                        className={`py-2 px-3 text-right ${
                          res.axialForce >= 0 ? 'text-red-400' : 'text-blue-400'
                        }`}
                      >
                        {(res.axialForce / 1000).toFixed(2)} {res.axialForce >= 0 ? '(T)' : '(C)'}
                      </td>
                      <td className="py-2 px-3 text-right">{res.maxBendingMoment.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-amber-400">
                        {sMpa.toFixed(1)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          fos < 1.5
                            ? 'text-red-400'
                            : fos < 2.0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {fos.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Nodal Displacements */}
      {activeSubTab === 'displacements' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 border-b border-slate-800 font-sans">
                <tr>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-right">ux (mm)</th>
                  <th className="py-2.5 px-3 text-right">uy (mm)</th>
                  <th className="py-2.5 px-3 text-right">uz (mm)</th>
                  <th className="py-2.5 px-3 text-right">Total Disp δ (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {nodes.map((node) => {
                  const disp = feaResult.nodeDisplacements.get(node.id);
                  if (!disp) return null;
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
                      <td className="py-2 px-3 font-sans text-slate-300">{node.name || '—'}</td>
                      <td className="py-2 px-3 text-right">{(disp.ux * 1000).toFixed(3)}</td>
                      <td className="py-2 px-3 text-right">{(disp.uy * 1000).toFixed(3)}</td>
                      <td className="py-2 px-3 text-right">{(disp.uz * 1000).toFixed(3)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-cyan-300">
                        {(disp.totalDisp * 1000).toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Element Internal Forces */}
      {activeSubTab === 'forces' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 border-b border-slate-800 font-sans">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-right">Axial N (kN)</th>
                  <th className="py-2.5 px-3 text-right">Shear Vy (kN)</th>
                  <th className="py-2.5 px-3 text-right">Shear Vz (kN)</th>
                  <th className="py-2.5 px-3 text-right">Torsion Tx (N·m)</th>
                  <th className="py-2.5 px-3 text-right">Moment My (N·m)</th>
                  <th className="py-2.5 px-3 text-right">Moment Mz (N·m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {elements.map((elem) => {
                  const res = feaResult.elementResults.get(elem.id);
                  if (!res) return null;
                  const isSelected = elem.id === selectedElementId;

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
                      <td
                        className={`py-2 px-3 text-right ${
                          res.axialForce >= 0 ? 'text-red-400' : 'text-blue-400'
                        }`}
                      >
                        {(res.axialForce / 1000).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">{(res.shearForceY / 1000).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{(res.shearForceZ / 1000).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{res.torsionTx.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{res.bendingMomentMy.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{res.bendingMomentMz.toFixed(1)}</td>
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
