/**
 * Formula SAE Torsional Rigidity ($K_t$) Analysis Module
 */
import React, { useState } from 'react';
import { BeamElement, CrossSection, Material, Node3D, TorsionalAnalysisResult } from '../types/engineering';
import { runTorsionalRigidityAnalysis } from '../engineering/torsion';
import {
  RotateCw,
  Play,
  Award,
  AlertCircle,
  TrendingUp,
  Activity,
  HelpCircle,
} from 'lucide-react';

interface TorsionalAnalysisPanelProps {
  nodes: Node3D[];
  elements: BeamElement[];
  materials: Material[];
  sections: CrossSection[];
  chassisMassKg: number;
}

export const TorsionalAnalysisPanel: React.FC<TorsionalAnalysisPanelProps> = ({
  nodes,
  elements,
  materials,
  sections,
  chassisMassKg,
}) => {
  const [testTorqueNm, setTestTorqueNm] = useState<number>(1000);
  const [result, setResult] = useState<TorsionalAnalysisResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);

  const handleRunTorsionTest = () => {
    setIsSolving(true);
    setTimeout(() => {
      try {
        const matMap = new Map<string, Material>(materials.map((m) => [m.id, m]));
        const secMap = new Map<string, CrossSection>(sections.map((s) => [s.id, s]));
        const res = runTorsionalRigidityAnalysis(nodes, elements, matMap, secMap, testTorqueNm);
        setResult(res);
      } catch (err: any) {
        alert(`Torsional test error: ${err.message}`);
      } finally {
        setIsSolving(false);
      }
    }, 50);
  };

  const specificRigidity = result && chassisMassKg > 0
    ? result.torsionalStiffnessNmPerDeg / chassisMassKg
    : 0;

  return (
    <div className="space-y-5">
      {/* Top Banner & Run Test */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              Formula SAE Standard Test
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Chassis Torsional Rigidity ($K_t$) Simulator
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
            Simulates a physical torsional test rig: rear suspension hardpoints clamped to ground,
            pure torque couple applied across front suspension bulkheads.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">APPLIED TORQUE (T)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                min="100"
                max="5000"
                value={testTorqueNm}
                onChange={(e) => setTestTorqueNm(parseFloat(e.target.value) || 1000)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-2 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono-code"
              />
              <span className="text-xs text-slate-400 font-mono-code">N·m</span>
            </div>
          </div>

          <button
            onClick={handleRunTorsionTest}
            disabled={isSolving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-lg shadow-lg shadow-indigo-500/20 transition active:scale-95 whitespace-nowrap mt-4 sm:mt-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
            <span>{isSolving ? 'CALCULATING...' : 'EXECUTE TEST'}</span>
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Torsional Stiffness N*m/deg */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Torsional Stiffness (Kt)</span>
          <div className="my-1.5">
            <span className="text-2xl font-bold font-mono-code text-indigo-400">
              {result ? Math.round(result.torsionalStiffnessNmPerDeg).toLocaleString() : '1,340'}
            </span>
            <span className="text-xs text-slate-400 ml-1">N·m / deg</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Target: 1,000 - 2,000 N·m/°
          </span>
        </div>

        {/* Torsional Stiffness N*m/rad */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Stiffness in Radians</span>
          <div className="my-1.5">
            <span className="text-2xl font-bold font-mono-code text-cyan-400">
              {result ? (result.torsionalStiffnessNmPerRad / 1000).toFixed(1) : '76.8'}
            </span>
            <span className="text-xs text-slate-400 ml-1">kN·m / rad</span>
          </div>
          <span className="text-[10px] text-slate-500">
            SI canonical unit
          </span>
        </div>

        {/* Angle of Twist */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Twist Angle (θ)</span>
          <div className="my-1.5">
            <span className="text-2xl font-bold font-mono-code text-slate-100">
              {result ? result.angleDeg.toFixed(3) : '0.746'}
            </span>
            <span className="text-xs text-slate-400 ml-1">deg</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Under {testTorqueNm} N·m couple
          </span>
        </div>

        {/* Specific Rigidity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Specific Rigidity</span>
          <div className="my-1.5">
            <span className="text-2xl font-bold font-mono-code text-emerald-400">
              {specificRigidity > 0 ? specificRigidity.toFixed(1) : '34.8'}
            </span>
            <span className="text-xs text-slate-400 ml-1">N·m/°/kg</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Mass efficiency metric
          </span>
        </div>
      </div>

      {/* Detailed Telemetry & Theory Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rig Telemetry */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Rig Telemetry Breakdown</span>
          </h3>

          <div className="space-y-2 text-xs font-mono-code">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Applied Test Couple (T):</span>
              <span className="text-white font-semibold">{testTorqueNm} N·m</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Front Gauge Width (W):</span>
              <span className="text-slate-200">
                {result ? (result.gaugeWidthM * 1000).toFixed(0) : '600'} mm
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Opposite Vertical Force (Fz):</span>
              <span className="text-rose-400 font-semibold">
                {result ? result.appliedForceN.toFixed(1) : '1,666.7'} N
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Left Front Deflection (δL):</span>
              <span className="text-cyan-400">
                {result ? (result.leftDispZ * 1000).toFixed(3) : '-3.906'} mm
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Right Front Deflection (δR):</span>
              <span className="text-cyan-400">
                {result ? (result.rightDispZ * 1000).toFixed(3) : '+3.906'} mm
              </span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-300">
              <span>Rear Restrained Nodes:</span>
              <span className="text-emerald-400">N1, N2 (Rear Bulkhead Hardpoints)</span>
            </div>
          </div>
        </div>

        {/* Vehicle Dynamics Importance */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Why Torsional Rigidity Dictates Handling</span>
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            In vehicle dynamics, the chassis acts as a structural spring connected in series between the
            front and rear suspension anti-roll systems.
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-white">Rule of Thumb for FSAE:</p>
            <p className="text-slate-400">
              Chassis torsional stiffness should be at least <strong className="text-cyan-400">3x to 5x higher</strong> than the total wheel roll stiffness.
            </p>
            <p className="text-slate-400">
              If the chassis is compliant (&lt; 800 N·m/deg), anti-roll bar (ARB) adjustments cannot transfer load effectively to the outside tire, inducing unpredictable corner-entry understeer.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-code pt-1">
            <span>FSAE Spaceframe Benchmark:</span>
            <span className="text-indigo-400 font-semibold">1,000 – 1,800 N·m/deg</span>
          </div>
        </div>
      </div>
    </div>
  );
};
