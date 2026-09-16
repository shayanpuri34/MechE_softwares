/**
 * Design Comparison & Snapshot Manager
 */
import React, { useState } from 'react';
import { DesignSnapshot, FEAResult, ChassisProject } from '../types/engineering';
import {
  BookmarkPlus,
  Trash2,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Check,
  RotateCcw,
} from 'lucide-react';

interface DesignComparisonPanelProps {
  project: ChassisProject;
  feaResult: FEAResult | null;
  onRestoreSnapshot?: (snapshot: DesignSnapshot) => void;
}

export const DesignComparisonPanel: React.FC<DesignComparisonPanelProps> = ({
  project,
  feaResult,
}) => {
  // Baseline initial snapshot
  const [snapshots, setSnapshots] = useState<DesignSnapshot[]>([
    {
      id: 'snap_baseline',
      name: 'Baseline 4130 Spaceframe',
      timestamp: Date.now() - 3600000,
      massKg: 38.5,
      torsionalStiffnessNmDeg: 1340,
      maxStressMpa: 142.6,
      minFactorOfSafety: 3.05,
      maxDisplacementMm: 1.84,
      notes: 'Baseline configuration with 1.0" x 0.095" hoops and 0.065" bracing.',
    },
    {
      id: 'snap_lightweight',
      name: 'Lightweight SIS / Thin Wall',
      timestamp: Date.now() - 1800000,
      massKg: 32.1,
      torsionalStiffnessNmDeg: 1180,
      maxStressMpa: 188.4,
      minFactorOfSafety: 2.31,
      maxDisplacementMm: 2.35,
      notes: 'Reduced secondary bracing to 0.049" wall thickness.',
    },
    {
      id: 'snap_endurance',
      name: 'High-Rigidity Endurance Spec',
      timestamp: Date.now() - 600000,
      massKg: 42.8,
      torsionalStiffnessNmDeg: 1620,
      maxStressMpa: 119.2,
      minFactorOfSafety: 3.65,
      maxDisplacementMm: 1.41,
      notes: 'Added engine bay cross-bracing and oversized front bulkhead diagonals.',
    },
  ]);

  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotNotes, setNewSnapshotNotes] = useState('');

  // Save current design snapshot
  const handleSaveSnapshot = () => {
    if (!feaResult) {
      alert('Run FEA first to capture structural metrics.');
      return;
    }

    const newSnap: DesignSnapshot = {
      id: `snap_${Date.now()}`,
      name: newSnapshotName.trim() || `Design Variant ${snapshots.length + 1}`,
      timestamp: Date.now(),
      massKg: Number(feaResult.chassisMassKg.toFixed(2)),
      torsionalStiffnessNmDeg: Number(
        (feaResult.torsionalStiffness?.ktNmPerDeg || 1340).toFixed(1)
      ),
      maxStressMpa: Number(feaResult.maxStressMpa.toFixed(1)),
      minFactorOfSafety: Number(feaResult.minFactorOfSafety.toFixed(2)),
      maxDisplacementMm: Number(feaResult.maxDisplacementMm.toFixed(2)),
      notes: newSnapshotNotes.trim() || 'Current configuration snapshot.',
    };

    setSnapshots([newSnap, ...snapshots]);
    setNewSnapshotName('');
    setNewSnapshotNotes('');
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots(snapshots.filter((s) => s.id !== id));
  };

  const baseline = snapshots[0];

  return (
    <div className="space-y-5">
      {/* Save Snapshot Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BookmarkPlus className="w-4 h-4 text-cyan-400" />
          <span>Capture Current Design Snapshot</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Variant Name</label>
            <input
              type="text"
              placeholder="e.g. Iteration 4 - Titanium Diagonals"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Notes / Changes</label>
            <input
              type="text"
              placeholder="e.g. Changed hoop wall to 2.8mm"
              value={newSnapshotNotes}
              onChange={(e) => setNewSnapshotNotes(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
            />
          </div>

          <button
            onClick={handleSaveSnapshot}
            className="flex items-center justify-center gap-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow transition"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Snapshot</span>
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Side-by-Side Design Variants Comparison
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {snapshots.length} variants recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-sans">
              <tr>
                <th className="py-3 px-4">Design Variant</th>
                <th className="py-3 px-3 text-right">Chassis Mass</th>
                <th className="py-3 px-3 text-right">Kt Rigidity</th>
                <th className="py-3 px-3 text-right">Specific Rigidity</th>
                <th className="py-3 px-3 text-right">Max Stress</th>
                <th className="py-3 px-3 text-right">Min FoS</th>
                <th className="py-3 px-3 text-right">Max Disp</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {snapshots.map((snap, idx) => {
                const isBase = idx === 0;
                const deltaMass = baseline
                  ? ((snap.massKg - baseline.massKg) / baseline.massKg) * 100
                  : 0;
                const deltaKt = baseline
                  ? ((snap.torsionalStiffnessNmDeg - baseline.torsionalStiffnessNmDeg) /
                      baseline.torsionalStiffnessNmDeg) *
                    100
                  : 0;
                const specific = snap.massKg > 0 ? snap.torsionalStiffnessNmDeg / snap.massKg : 0;

                return (
                  <tr key={snap.id} className="hover:bg-slate-800/40 text-slate-300">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{snap.name}</span>
                        {isBase && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                            BASELINE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{snap.notes}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-100">
                      {snap.massKg.toFixed(1)} kg
                      {!isBase && (
                        <span
                          className={`block text-[10px] ${
                            deltaMass <= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {deltaMass <= 0 ? '' : '+'}
                          {deltaMass.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-indigo-400">
                      {Math.round(snap.torsionalStiffnessNmDeg)} N·m/°
                      {!isBase && (
                        <span
                          className={`block text-[10px] ${
                            deltaKt >= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {deltaKt >= 0 ? '+' : ''}
                          {deltaKt.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                      {specific.toFixed(1)} N·m/°/kg
                    </td>

                    <td className="py-3 px-3 text-right text-amber-400">{snap.maxStressMpa.toFixed(1)} MPa</td>

                    <td className="py-3 px-3 text-right font-bold">{snap.minFactorOfSafety.toFixed(2)}</td>

                    <td className="py-3 px-3 text-right text-cyan-400">{snap.maxDisplacementMm.toFixed(2)} mm</td>

                    <td className="py-3 px-3 text-center">
                      {!isBase && (
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
