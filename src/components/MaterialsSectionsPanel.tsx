/**
 * Materials Database & Tube Cross-Section Mechanics Panel
 */
import React, { useState } from 'react';
import { CrossSection, Material } from '../types/engineering';
import { calculateShearModulus } from '../engineering/materials';
import { createCircularTubeSection, getLinearMassDensity } from '../engineering/sections';
import {
  Layers,
  Circle,
  Plus,
  Trash2,
  BookOpen,
  Calculator,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface MaterialsSectionsPanelProps {
  materials: Material[];
  sections: CrossSection[];
  onUpdateMaterials: (materials: Material[]) => void;
  onUpdateSections: (sections: CrossSection[]) => void;
}

export const MaterialsSectionsPanel: React.FC<MaterialsSectionsPanelProps> = ({
  materials,
  sections,
  onUpdateMaterials,
  onUpdateSections,
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'sections' | 'fsae_rules'>('sections');

  // Custom Tube Form State
  const [newSecName, setNewSecName] = useState('');
  const [newSecDoMm, setNewSecDoMm] = useState('25.4'); // 1 inch
  const [newSecTMm, setNewSecTMm] = useState('1.65'); // 0.065 inch
  const [newSecCategory, setNewSecCategory] = useState<CrossSection['fsaeCategory']>('roll_hoop_bracing');

  // Custom Material Form State
  const [newMatName, setNewMatName] = useState('');
  const [newMatE, setNewMatE] = useState('200'); // GPa
  const [newMatNu, setNewMatNu] = useState('0.30');
  const [newMatDensity, setNewMatDensity] = useState('7850'); // kg/m^3
  const [newMatYield, setNewMatYield] = useState('350'); // MPa

  // Add Custom Section
  const handleAddSection = () => {
    const DoM = parseFloat(newSecDoMm) / 1000;
    const tM = parseFloat(newSecTMm) / 1000;
    if (isNaN(DoM) || isNaN(tM) || DoM <= 0 || tM <= 0 || tM >= DoM / 2) {
      alert('Invalid tube dimensions. Wall thickness must be positive and less than outer radius.');
      return;
    }

    const id = `sec_custom_${Date.now()}`;
    const name = newSecName.trim() || `Custom Tube (${newSecDoMm} x ${newSecTMm} mm)`;
    const newSec = createCircularTubeSection(id, name, DoM, tM, newSecCategory);

    onUpdateSections([...sections, newSec]);
    setNewSecName('');
  };

  // Add Custom Material
  const handleAddMaterial = () => {
    const ePa = parseFloat(newMatE) * 1e9;
    const nu = parseFloat(newMatNu);
    const rho = parseFloat(newMatDensity);
    const yieldPa = parseFloat(newMatYield) * 1e6;

    if (isNaN(ePa) || isNaN(nu) || isNaN(rho) || isNaN(yieldPa)) return;

    const id = `mat_custom_${Date.now()}`;
    const newMat: Material = {
      id,
      name: newMatName.trim() || 'Custom Alloy',
      description: 'User-specified engineering material.',
      E: ePa,
      poisson: nu,
      density: rho,
      yieldStrength: yieldPa,
      ultimateStrength: yieldPa * 1.3,
      isCustom: true,
    };

    onUpdateMaterials([...materials, newMat]);
    setNewMatName('');
  };

  return (
    <div className="space-y-4">
      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'sections'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Tube Cross-Sections ({sections.length})
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'materials'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Materials Database ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('fsae_rules')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'fsae_rules'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          FSAE SES Rule Standards
        </button>
      </div>

      {/* 1. Cross-Sections Tab */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          {/* Custom Section Builder */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>Define Circular Tube Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Section Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. 1.25 x 0.083 Tube"
                  value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Outer Diameter Do (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newSecDoMm}
                  onChange={(e) => setNewSecDoMm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Wall Thickness t (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={newSecTMm}
                  onChange={(e) => setNewSecTMm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">FSAE Category</label>
                <select
                  value={newSecCategory}
                  onChange={(e) => setNewSecCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                >
                  <option value="main_hoop">Main Hoop</option>
                  <option value="front_hoop">Front Hoop</option>
                  <option value="roll_hoop_bracing">Hoop Bracing / SIS</option>
                  <option value="front_bulkhead">Front Bulkhead</option>
                  <option value="other">Secondary / Bracing</option>
                </select>
              </div>

              <button
                onClick={handleAddSection}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Calculate & Add</span>
              </button>
            </div>
          </div>

          {/* Sections Geometric Properties Cards / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((sec) => {
              const doMm = sec.outerDiameter * 1000;
              const diMm = sec.innerDiameter * 1000;
              const tMm = sec.wallThickness * 1000;
              const areaMm2 = sec.area * 1e6;
              const steelMassPerM = getLinearMassDensity(sec, 7850);

              return (
                <div
                  key={sec.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white leading-snug">{sec.name}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {sec.fsaeCategory?.replace('_', ' ') || 'Tube'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs font-mono-code">
                      <div className="flex justify-between text-slate-400">
                        <span>Outer / Inner Dia:</span>
                        <span className="text-slate-200">
                          {doMm.toFixed(1)} / {diMm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Wall Thickness:</span>
                        <span className="text-cyan-400 font-semibold">{tMm.toFixed(2)} mm</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Cross Area (A):</span>
                        <span className="text-slate-200">{areaMm2.toFixed(1)} mm²</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Moment of Inertia (I):</span>
                        <span className="text-slate-200">{sec.I.toExponential(3)} m⁴</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Polar Moment (J):</span>
                        <span className="text-slate-200">{sec.J.toExponential(3)} m⁴</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Linear Mass (4130):</span>
                        <span className="text-indigo-400 font-semibold">{steelMassPerM.toFixed(2)} kg/m</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Materials Tab */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Add Custom Material */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Define Custom Material</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Material Name</label>
                <input
                  type="text"
                  placeholder="e.g. Magnesium Alloy"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Young's Modulus E (GPa)</label>
                <input
                  type="number"
                  step="1"
                  value={newMatE}
                  onChange={(e) => setNewMatE(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Poisson's Ratio ν</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMatNu}
                  onChange={(e) => setNewMatNu(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Density ρ (kg/m³)</label>
                <input
                  type="number"
                  step="10"
                  value={newMatDensity}
                  onChange={(e) => setNewMatDensity(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Yield Strength (MPa)</label>
                <input
                  type="number"
                  step="10"
                  value={newMatYield}
                  onChange={(e) => setNewMatYield(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono-code"
                />
              </div>
              <button
                onClick={handleAddMaterial}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Material</span>
              </button>
            </div>
          </div>

          {/* Materials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {materials.map((mat) => {
              const G = calculateShearModulus(mat.E, mat.poisson);
              return (
                <div
                  key={mat.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-white">{mat.name}</h4>
                      {mat.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono-code">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {mat.description}
                    </p>

                    <div className="mt-3 space-y-1.5 text-xs font-mono-code">
                      <div className="flex justify-between text-slate-400">
                        <span>Modulus of Elasticity (E):</span>
                        <span className="text-cyan-400 font-semibold">{(mat.E / 1e9).toFixed(1)} GPa</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Shear Modulus (G):</span>
                        <span className="text-slate-200">{(G / 1e9).toFixed(1)} GPa</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Poisson's Ratio (ν):</span>
                        <span className="text-slate-200">{mat.poisson.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Density (ρ):</span>
                        <span className="text-slate-200">{mat.density} kg/m³</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Yield Strength (σy):</span>
                        <span className="text-amber-400 font-semibold">{(mat.yieldStrength / 1e6).toFixed(0)} MPa</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FSAE SES Standards Reference */}
      {activeTab === 'fsae_rules' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Formula SAE Structural Equivalency Spreadsheet (SES) Baseline Requirements
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Formula SAE and Formula Student rules mandate strict minimum outer diameters, wall thicknesses,
            and bending moments of inertia for primary roll-over protection and side impact structures
            when using round steel tubing (AISI 1020 or 4130 steel).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-sans">Chassis Member / Category</th>
                  <th className="py-2.5 px-3">Min Outer Dia</th>
                  <th className="py-2.5 px-3">Min Wall Thickness</th>
                  <th className="py-2.5 px-3">Min Area (mm²)</th>
                  <th className="py-2.5 px-3">Min Moment (I, mm⁴)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Main Hoop (MH)</td>
                  <td className="py-2 px-3 text-cyan-400">25.4 mm (1.000")</td>
                  <td className="py-2 px-3 text-cyan-400">2.41 mm (0.095")</td>
                  <td className="py-2 px-3">173.9 mm²</td>
                  <td className="py-2 px-3">11,320 mm⁴</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Front Hoop (FH)</td>
                  <td className="py-2 px-3 text-cyan-400">25.4 mm (1.000")</td>
                  <td className="py-2 px-3 text-cyan-400">2.41 mm (0.095")</td>
                  <td className="py-2 px-3">173.9 mm²</td>
                  <td className="py-2 px-3">11,320 mm⁴</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Main / Front Hoop Braces</td>
                  <td className="py-2 px-3 text-cyan-400">25.4 mm (1.000")</td>
                  <td className="py-2 px-3 text-cyan-400">1.65 mm (0.065")</td>
                  <td className="py-2 px-3">123.1 mm²</td>
                  <td className="py-2 px-3">8,509 mm⁴</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Side Impact Structure (SIS)</td>
                  <td className="py-2 px-3 text-cyan-400">25.4 mm (1.000")</td>
                  <td className="py-2 px-3 text-cyan-400">1.65 mm (0.065")</td>
                  <td className="py-2 px-3">123.1 mm²</td>
                  <td className="py-2 px-3">8,509 mm⁴</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Front Bulkhead & Supports</td>
                  <td className="py-2 px-3 text-cyan-400">25.4 mm (1.000")</td>
                  <td className="py-2 px-3 text-cyan-400">1.65 mm (0.065")</td>
                  <td className="py-2 px-3">123.1 mm²</td>
                  <td className="py-2 px-3">8,509 mm⁴</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-sans text-white font-medium">Secondary / Triangulation Tubes</td>
                  <td className="py-2 px-3 text-slate-400">25.4 mm or 19.05 mm</td>
                  <td className="py-2 px-3 text-slate-400">1.24 mm (0.049")</td>
                  <td className="py-2 px-3">94.2 mm²</td>
                  <td className="py-2 px-3">6,625 mm⁴</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
