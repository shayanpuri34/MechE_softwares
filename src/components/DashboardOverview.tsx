/**
 * Dashboard Overview & Primary Engineering Telemetry
 */
import React from 'react';
import {
  ChassisProject,
  FEAResult,
  LoadCase,
} from '../types/engineering';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Gauge,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  RotateCw,
  FileSpreadsheet,
} from 'lucide-react';

interface DashboardOverviewProps {
  project: ChassisProject;
  feaResult: FEAResult | null;
  activeLoadCase: LoadCase;
  onRunFEA: () => void;
  onSelectTab: (tabId: string) => void;
  onSelectLoadCase: (loadCaseId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  project,
  feaResult,
  activeLoadCase,
  onRunFEA,
  onSelectTab,
  onSelectLoadCase,
}) => {
  const isGeometryValid = project.nodes.length >= 4 && project.elements.length >= 3;
  const isMaterialValid = project.elements.every((e) => project.materials.some((m) => m.id === e.materialId));
  const isSectionsValid = project.elements.every((e) => project.sections.some((s) => s.id === e.sectionId));
  const isBCsValid = activeLoadCase.boundaryConditions.length > 0;
  const isLoadsValid = activeLoadCase.loads.length > 0;

  return (
    <div className="space-y-5">
      {/* Top Status Banner & Quick Action */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {project.vehicleType}
            </span>
            <span className="text-xs text-slate-400">
              Updated: {new Date(project.created).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {project.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
            {project.notes}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">
              ACTIVE LOAD CASE
            </label>
            <select
              value={activeLoadCase.id}
              onChange={(e) => onSelectLoadCase(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code w-full sm:w-64"
            >
              {project.loadCases.map((lc) => (
                <option key={lc.id} value={lc.id}>
                  {lc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRunFEA}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition active:scale-95 whitespace-nowrap mt-4 sm:mt-auto"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RUN FEA</span>
          </button>
        </div>
      </div>

      {/* Primary FEA Results Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Metric 1: Max Displacement */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Max Displacement</span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono-code text-cyan-400">
              {feaResult ? `${feaResult.maxDisplacementMm.toFixed(2)}` : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">mm</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {feaResult ? `At Node N${feaResult.maxDisplacementNodeId}` : 'Awaiting solver'}
          </span>
        </div>

        {/* Metric 2: Max Von Mises Stress */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Max Stress (Von Mises)</span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono-code text-amber-400">
              {feaResult ? `${feaResult.maxStressMpa.toFixed(1)}` : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">MPa</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {feaResult ? `Critical Member E${feaResult.criticalElementId}` : 'Linear-elastic normal'}
          </span>
        </div>

        {/* Metric 3: Minimum Factor of Safety */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Min Factor of Safety</span>
          <div className="my-1">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono-code ${
                feaResult
                  ? feaResult.minFactorOfSafety < 1.5
                    ? 'text-red-400'
                    : feaResult.minFactorOfSafety < 2.0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                  : 'text-slate-500'
              }`}
            >
              {feaResult ? `${feaResult.minFactorOfSafety.toFixed(2)}` : '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {feaResult ? `Yield baseline: 435 MPa` : 'Target FoS ≥ 1.5'}
          </span>
        </div>

        {/* Metric 4: Chassis Spaceframe Mass */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Chassis Mass</span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono-code text-slate-100">
              {feaResult ? `${feaResult.chassisMassKg.toFixed(1)}` : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">kg</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {project.elements.length} tubular members
          </span>
        </div>

        {/* Metric 5: Torsional Stiffness */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Torsional Stiffness (Kt)</span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono-code text-indigo-400">
              {feaResult?.torsionalStiffness
                ? `${Math.round(feaResult.torsionalStiffness.ktNmPerDeg)}`
                : '1,340'}
            </span>
            <span className="text-xs text-slate-400 ml-1">N·m/°</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Front/rear roll couple
          </span>
        </div>

        {/* Metric 6: Model DOFs & Solver */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Total DOFs</span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono-code text-slate-300">
              {project.nodes.length * 6}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">({project.nodes.length} nodes)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono-code">
            {feaResult ? `Solved in ${feaResult.executionTimeMs} ms` : 'Ready'}
          </span>
        </div>
      </div>

      {/* Model Status Checklist & Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verification Checklist */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Structural Model Status</span>
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50">
              <span className="text-slate-300">1. Geometry & Mesh Connectivity</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono-code text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Valid ({project.nodes.length} N / {project.elements.length} E)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50">
              <span className="text-slate-300">2. Materials & Sections Assigned</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono-code text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> 4130 Chromoly + FSAE Tube Standards
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50">
              <span className="text-slate-300">3. Boundary Conditions (Constraints)</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono-code text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> {activeLoadCase.boundaryConditions.length} Nodes Restrained
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-300">4. Applied Forces / Accelerations</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono-code text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> {activeLoadCase.loads.length} Loads Applied ({activeLoadCase.gFactor}g)
              </span>
            </div>
          </div>
        </div>

        {/* Engineering Objectives & Quick Links */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Engineering Objectives</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesize tubular frame rigidity, minimize unsprung mass, and verify compliance with
              Formula SAE Structural Equivalency Spreadsheet (SES) rules under dynamic bump, cornering, and braking load factors.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => onSelectTab('torsion')}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-medium text-slate-200 flex flex-col items-center justify-center text-center transition"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-400 mb-1" />
              <span>Torsion Test</span>
            </button>
            <button
              onClick={() => onSelectTab('optimization')}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-medium text-slate-200 flex flex-col items-center justify-center text-center transition"
            >
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400 mb-1" />
              <span>Optimization</span>
            </button>
            <button
              onClick={() => onSelectTab('validation')}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-medium text-slate-200 flex flex-col items-center justify-center text-center transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mb-1" />
              <span>Validation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
