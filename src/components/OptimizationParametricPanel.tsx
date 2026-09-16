/**
 * Structural Optimization, Parametric Studies, and Member Sensitivity Analysis
 */
import React, { useState } from 'react';
import {
  BeamElement,
  BoundaryCondition,
  CrossSection,
  Material,
  NodalLoad,
  Node3D,
  OptimizationCandidate,
} from '../types/engineering';
import {
  MemberSensitivityResult,
  optimizeChassis,
  ParametricSweepPoint,
  runMemberRemovalStudy,
  runThicknessParametricSweep,
} from '../engineering/optimization';
import {
  Sliders,
  TrendingDown,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  BarChart2,
  HelpCircle,
} from 'lucide-react';

interface OptimizationParametricPanelProps {
  nodes: Node3D[];
  elements: BeamElement[];
  materials: Material[];
  sections: CrossSection[];
  bcs: BoundaryCondition[];
  loads: NodalLoad[];
  onSelectElement: (id: number | null) => void;
}

export const OptimizationParametricPanel: React.FC<OptimizationParametricPanelProps> = ({
  nodes,
  elements,
  materials,
  sections,
  bcs,
  loads,
  onSelectElement,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sensitivity' | 'sweep' | 'optimize'>('sensitivity');

  // Sensitivity Study State
  const [sensitivityResults, setSensitivityResults] = useState<MemberSensitivityResult[]>([]);
  const [isEvaluatingSensitivity, setIsEvaluatingSensitivity] = useState(false);

  // Parametric Sweep State
  const [sweepPoints, setSweepPoints] = useState<ParametricSweepPoint[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);

  // Optimization State
  const [candidates, setCandidates] = useState<OptimizationCandidate[]>([]);
  const [minFosInput, setMinFosInput] = useState('1.8');
  const [minKtInput, setMinKtInput] = useState('1100');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Execute Member Removal Sensitivity Study
  const handleRunSensitivityStudy = () => {
    setIsEvaluatingSensitivity(true);
    setTimeout(() => {
      try {
        const matMap = new Map<string, Material>(materials.map((m) => [m.id, m]));
        const secMap = new Map<string, CrossSection>(sections.map((s) => [s.id, s]));

        // Focus on secondary & bracing members
        const candidateElements = elements.filter(
          (e) => e.category === 'bracing' || e.category === 'triangulation' || e.category === 'structure'
        );

        const results: MemberSensitivityResult[] = [];
        for (const elem of candidateElements.slice(0, 16)) {
          const res = runMemberRemovalStudy(elem.id, nodes, elements, matMap, secMap, bcs, loads);
          results.push(res);
        }

        // Sort by structural efficiency descending (most critical tubes first)
        results.sort((a, b) => b.structuralEfficiency - a.structuralEfficiency);
        setSensitivityResults(results);
      } catch (err: any) {
        alert(`Error running sensitivity study: ${err.message}`);
      } finally {
        setIsEvaluatingSensitivity(false);
      }
    }, 50);
  };

  // Execute Tube Thickness Sweep
  const handleRunThicknessSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      try {
        const matMap = new Map<string, Material>(materials.map((m) => [m.id, m]));
        const secMap = new Map<string, CrossSection>(sections.map((s) => [s.id, s]));
        const pts = runThicknessParametricSweep(
          nodes,
          elements,
          matMap,
          secMap,
          bcs,
          loads,
          [0.9, 1.2, 1.5, 1.65, 2.0, 2.4, 2.8]
        );
        setSweepPoints(pts);
      } catch (err: any) {
        alert(`Sweep error: ${err.message}`);
      } finally {
        setIsSweeping(false);
      }
    }, 50);
  };

  // Execute Chassis Optimization
  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const matMap = new Map<string, Material>(materials.map((m) => [m.id, m]));
        const fos = parseFloat(minFosInput) || 1.8;
        const kt = parseFloat(minKtInput) || 1000;
        const cand = optimizeChassis(nodes, elements, matMap, bcs, loads, fos, kt);
        setCandidates(cand);
      } catch (err: any) {
        alert(`Optimization error: ${err.message}`);
      } finally {
        setIsOptimizing(false);
      }
    }, 50);
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveSubTab('sensitivity')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'sensitivity'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Member Removal Sensitivity Study
        </button>
        <button
          onClick={() => setActiveSubTab('sweep')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'sweep'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Tube Thickness vs. Rigidity Sweep
        </button>
        <button
          onClick={() => setActiveSubTab('optimize')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'optimize'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Structural Optimization Engine
        </button>
      </div>

      {/* 1. Member Removal Sensitivity */}
      {activeSubTab === 'sensitivity' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-cyan-400" />
                <span>"What happens if this member is removed?"</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Evaluates redundant or parasitic mass by systematically removing each frame member,
                re-solving the full 3D stiffness matrix, and calculating the exact percentage change in
                torsional rigidity ($K_t$) and stress.
              </p>
            </div>

            <button
              onClick={handleRunSensitivityStudy}
              disabled={isEvaluatingSensitivity}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow transition active:scale-95 whitespace-nowrap"
            >
              <Play className={`w-3.5 h-3.5 fill-slate-950 ${isEvaluatingSensitivity ? 'animate-spin' : ''}`} />
              <span>{isEvaluatingSensitivity ? 'ANALYZING...' : 'RUN REMOVAL STUDY'}</span>
            </button>
          </div>

          {sensitivityResults.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Evaluated {sensitivityResults.length} Frame Members
                </span>
                <span className="text-[11px] text-slate-400">
                  Sorted by Structural Efficiency Index (% &Delta; Kt / % &Delta; Mass)
                </span>
              </div>

              <div className="max-h-[440px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono-code">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800 font-sans">
                    <tr>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3">Label</th>
                      <th className="py-2.5 px-3 text-right">Mass Saved</th>
                      <th className="py-2.5 px-3 text-right">Δ Kt Rigidity</th>
                      <th className="py-2.5 px-3 text-right">Δ Max Stress</th>
                      <th className="py-2.5 px-3 text-right">Efficiency Index</th>
                      <th className="py-2.5 px-3 text-center">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sensitivityResults.map((res) => {
                      return (
                        <tr
                          key={res.elementId}
                          onClick={() => onSelectElement(res.elementId)}
                          className="hover:bg-slate-800/40 text-slate-300 cursor-pointer"
                        >
                          <td className="py-2 px-3 font-semibold text-cyan-400">E{res.elementId}</td>
                          <td className="py-2 px-3 font-sans text-slate-200">{res.elementName}</td>
                          <td className="py-2 px-3 text-right text-emerald-400">
                            {Math.abs(res.deltaMassKg).toFixed(2)} kg
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-semibold ${
                              res.deltaKtPercent < -10 ? 'text-red-400' : 'text-slate-300'
                            }`}
                          >
                            {res.deltaKtPercent.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {res.deltaStressPercent > 0 ? `+${res.deltaStressPercent.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-cyan-300">
                            {res.structuralEfficiency.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {res.status === 'critical' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                                CRITICAL
                              </span>
                            )}
                            {res.status === 'effective' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                EFFECTIVE
                              </span>
                            )}
                            {res.status === 'inefficient' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                                LOW LOAD
                              </span>
                            )}
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
      )}

      {/* 2. Parametric Sweep */}
      {activeSubTab === 'sweep' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Tube Wall Thickness vs. Rigidity Parameter Sweep</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Sweeps tubular wall thickness from 0.9 mm to 2.8 mm to visualize the structural
                diminishing returns frontier (mass addition vs. torsional rigidity gain).
              </p>
            </div>

            <button
              onClick={handleRunThicknessSweep}
              disabled={isSweeping}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow transition active:scale-95 whitespace-nowrap"
            >
              <Play className={`w-3.5 h-3.5 fill-slate-950 ${isSweeping ? 'animate-spin' : ''}`} />
              <span>{isSweeping ? 'COMPUTING SWEEP...' : 'RUN PARAMETRIC SWEEP'}</span>
            </button>
          </div>

          {sweepPoints.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono-code">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Wall Thickness (t)</th>
                    <th className="py-2.5 px-3 text-right">Chassis Mass</th>
                    <th className="py-2.5 px-3 text-right">Torsional Stiffness (Kt)</th>
                    <th className="py-2.5 px-3 text-right">Stiffness-to-Weight</th>
                    <th className="py-2.5 px-3 text-right">Max Stress</th>
                    <th className="py-2.5 px-3 text-right">Min FoS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sweepPoints.map((pt, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-2 px-3 font-semibold text-cyan-400">{pt.label}</td>
                      <td className="py-2 px-3 text-right text-slate-100 font-bold">{pt.massKg} kg</td>
                      <td className="py-2 px-3 text-right text-indigo-400 font-bold">
                        {pt.torsionalStiffnessNmDeg} N·m/°
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                        {pt.stiffnessToWeight} N·m/°/kg
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400">{pt.maxStressMpa} MPa</td>
                      <td className="py-2 px-3 text-right">{pt.minFoS.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Constrained Structural Optimization */}
      {activeSubTab === 'optimize' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <span>Chassis Mass Minimization under Safety & Rigidity Constraints</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Searches optimal spaceframe tube schedules and alloy combinations to minimize total chassis mass
                while strictly satisfying minimum Factor of Safety and minimum Torsional Rigidity thresholds.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-4 pt-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">MIN FACTOR OF SAFETY</label>
                <input
                  type="number"
                  step="0.1"
                  value={minFosInput}
                  onChange={(e) => setMinFosInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">MIN TORSIONAL STIFFNESS (N·m/°)</label>
                <input
                  type="number"
                  step="50"
                  value={minKtInput}
                  onChange={(e) => setMinKtInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <button
                onClick={handleRunOptimization}
                disabled={isOptimizing}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow transition active:scale-95"
              >
                <Play className={`w-3.5 h-3.5 fill-slate-950 ${isOptimizing ? 'animate-spin' : ''}`} />
                <span>{isOptimizing ? 'SEARCHING DESIGNS...' : 'SOLVE OPTIMIZATION'}</span>
              </button>
            </div>
          </div>

          {candidates.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono-code">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Configuration</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3 text-right">Chassis Mass</th>
                    <th className="py-2.5 px-3 text-right">Mass Saved</th>
                    <th className="py-2.5 px-3 text-right">Kt Rigidity</th>
                    <th className="py-2.5 px-3 text-right">Min FoS</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-2 px-3 font-sans font-medium text-white">{cand.description}</td>
                      <td className="py-2 px-3 text-slate-400">{cand.materialName}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-100">{cand.massKg} kg</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                        {cand.massReductionPercent > 0 ? `-${cand.massReductionPercent}%` : `+${Math.abs(cand.massReductionPercent)}%`}
                      </td>
                      <td className="py-2 px-3 text-right text-indigo-400">{cand.torsionalStiffnessNmDeg} N·m/°</td>
                      <td className="py-2 px-3 text-right font-semibold">{cand.minFoS.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-sans">
                        {cand.isFeasible ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            FEASIBLE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                            INFEASIBLE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
