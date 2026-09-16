/**
 * Structural Optimization, Parametric Studies & Member Sensitivity Analysis
 */
import {
  BeamElement,
  BoundaryCondition,
  CrossSection,
  Material,
  Node3D,
  NodalLoad,
  OptimizationCandidate,
} from '../types/engineering';
import { STANDARD_MATERIALS } from './materials';
import { createCircularTubeSection } from './sections';
import { solveFEA } from './solver';
import { runTorsionalRigidityAnalysis } from './torsion';

export interface ParametricSweepPoint {
  parameterValue: number;
  label: string;
  massKg: number;
  maxStressMpa: number;
  maxDispMm: number;
  minFoS: number;
  torsionalStiffnessNmDeg: number;
  stiffnessToWeight: number;
}

export interface MemberSensitivityResult {
  elementId: number;
  elementName: string;
  category: string;
  lengthM: number;
  baselineMassKg: number;
  removedMassKg: number;
  deltaMassKg: number;
  baselineKtNmDeg: number;
  removedKtNmDeg: number;
  deltaKtPercent: number;
  baselineStressMpa: number;
  removedStressMpa: number;
  deltaStressPercent: number;
  structuralEfficiency: number; // (% Kt loss) / (% mass saved)
  status: 'critical' | 'effective' | 'inefficient' | 'redundant';
}

/**
 * Sweeps tube wall thickness across secondary/bracing members
 * to evaluate the mass vs. structural stiffness trade-off frontier.
 */
export function runThicknessParametricSweep(
  nodes: Node3D[],
  elements: BeamElement[],
  materialsMap: Map<string, Material>,
  sectionsMap: Map<string, CrossSection>,
  bcs: BoundaryCondition[],
  loads: NodalLoad[],
  thicknessRangeMm: number[] = [1.0, 1.25, 1.5, 1.75, 2.0, 2.4, 2.8]
): ParametricSweepPoint[] {
  const points: ParametricSweepPoint[] = [];

  for (const tMm of thicknessRangeMm) {
    const tM = tMm / 1000;
    const sweptSecMap = new Map<string, CrossSection>();

    // Update sections with swept thickness
    sectionsMap.forEach((sec, id) => {
      // Keep outer diameter, sweep thickness (safely checked)
      const safeT = Math.min(tM, sec.outerDiameter * 0.4);
      sweptSecMap.set(
        id,
        createCircularTubeSection(
          id,
          `${sec.name} (${tMm}mm wall)`,
          sec.outerDiameter,
          safeT,
          sec.fsaeCategory
        )
      );
    });

    try {
      const feaRes = solveFEA(nodes, elements, materialsMap, sweptSecMap, bcs, loads);
      const torsionRes = runTorsionalRigidityAnalysis(nodes, elements, materialsMap, sweptSecMap, 1000);

      points.push({
        parameterValue: tMm,
        label: `${tMm.toFixed(2)} mm`,
        massKg: Number(feaRes.chassisMassKg.toFixed(2)),
        maxStressMpa: Number(feaRes.maxStressMpa.toFixed(1)),
        maxDispMm: Number(feaRes.maxDisplacementMm.toFixed(2)),
        minFoS: Number(feaRes.minFactorOfSafety.toFixed(2)),
        torsionalStiffnessNmDeg: Number(torsionRes.torsionalStiffnessNmPerDeg.toFixed(1)),
        stiffnessToWeight: Number((torsionRes.torsionalStiffnessNmPerDeg / feaRes.chassisMassKg).toFixed(1)),
      });
    } catch {
      // Infeasible geometry or singular
    }
  }

  return points;
}

/**
 * Runs material comparison study: Steel 4130 vs Aluminum 6061-T6 vs Docol R8 vs Titanium
 */
export function runMaterialComparisonSweep(
  nodes: Node3D[],
  elements: BeamElement[],
  sectionsMap: Map<string, CrossSection>,
  bcs: BoundaryCondition[],
  loads: NodalLoad[]
): ParametricSweepPoint[] {
  const results: ParametricSweepPoint[] = [];

  for (const mat of STANDARD_MATERIALS) {
    const matMap = new Map<string, Material>([[mat.id, mat]]);
    const mappedElements = elements.map((el) => ({ ...el, materialId: mat.id }));

    try {
      const feaRes = solveFEA(nodes, mappedElements, matMap, sectionsMap, bcs, loads);
      const torsionRes = runTorsionalRigidityAnalysis(nodes, mappedElements, matMap, sectionsMap, 1000);

      results.push({
        parameterValue: mat.E / 1e9,
        label: mat.name.split(' ')[0] + ' ' + (mat.name.split(' ')[1] || ''),
        massKg: Number(feaRes.chassisMassKg.toFixed(2)),
        maxStressMpa: Number(feaRes.maxStressMpa.toFixed(1)),
        maxDispMm: Number(feaRes.maxDisplacementMm.toFixed(2)),
        minFoS: Number(feaRes.minFactorOfSafety.toFixed(2)),
        torsionalStiffnessNmDeg: Number(torsionRes.torsionalStiffnessNmPerDeg.toFixed(1)),
        stiffnessToWeight: Number((torsionRes.torsionalStiffnessNmPerDeg / feaRes.chassisMassKg).toFixed(1)),
      });
    } catch {
      // ignore
    }
  }

  return results;
}

/**
 * Member Removal Study:
 * "What happens if this member is removed?"
 * Removes the selected element, re-solves FEA and torsional stiffness,
 * and quantifies its structural necessity.
 */
export function runMemberRemovalStudy(
  targetElementId: number,
  nodes: Node3D[],
  elements: BeamElement[],
  materialsMap: Map<string, Material>,
  sectionsMap: Map<string, CrossSection>,
  bcs: BoundaryCondition[],
  loads: NodalLoad[],
  baselineFeaResult?: ReturnType<typeof solveFEA>,
  baselineTorsionResult?: ReturnType<typeof runTorsionalRigidityAnalysis>
): MemberSensitivityResult {
  const targetElem = elements.find((e) => e.id === targetElementId);
  if (!targetElem) {
    throw new Error(`Element E${targetElementId} not found.`);
  }

  // Baseline results
  const baseFea = baselineFeaResult || solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
  const baseTorsion =
    baselineTorsionResult || runTorsionalRigidityAnalysis(nodes, elements, materialsMap, sectionsMap, 1000);

  // Model with member removed
  const modifiedElements = elements.filter((e) => e.id !== targetElementId);

  let removedFea;
  let removedTorsion;
  try {
    removedFea = solveFEA(nodes, modifiedElements, materialsMap, sectionsMap, bcs, loads);
    removedTorsion = runTorsionalRigidityAnalysis(nodes, modifiedElements, materialsMap, sectionsMap, 1000);
  } catch (err: any) {
    // Member removal caused collapse / mechanism
    return {
      elementId: targetElem.id,
      elementName: targetElem.name || `Member E${targetElem.id}`,
      category: targetElem.category || 'structure',
      lengthM: 0,
      baselineMassKg: baseFea.chassisMassKg,
      removedMassKg: baseFea.chassisMassKg,
      deltaMassKg: 0,
      baselineKtNmDeg: baseTorsion.torsionalStiffnessNmPerDeg,
      removedKtNmDeg: 0,
      deltaKtPercent: -100,
      baselineStressMpa: baseFea.maxStressMpa,
      removedStressMpa: 9999,
      deltaStressPercent: 999,
      structuralEfficiency: 999,
      status: 'critical',
    };
  }

  const deltaMassKg = removedFea.chassisMassKg - baseFea.chassisMassKg; // negative (mass saved)
  const pctMassSaved = Math.abs(deltaMassKg / baseFea.chassisMassKg) * 100;

  const deltaKt = removedTorsion.torsionalStiffnessNmPerDeg - baseTorsion.torsionalStiffnessNmPerDeg;
  const pctKtChange = (deltaKt / baseTorsion.torsionalStiffnessNmPerDeg) * 100; // usually negative (stiffness loss)

  const deltaStress = removedFea.maxStressMpa - baseFea.maxStressMpa;
  const pctStressChange = (deltaStress / baseFea.maxStressMpa) * 100;

  // Efficiency: Ratio of % stiffness loss to % mass saved
  // If % Kt drops by 10% for only 0.5% mass saved -> Efficiency = 20 (highly critical tube!)
  // If % Kt drops by 0.1% for 1.0% mass saved -> Efficiency = 0.1 (inefficient / non-load bearing tube)
  const efficiency = pctMassSaved > 1e-4 ? Math.abs(pctKtChange) / pctMassSaved : 0;

  let status: MemberSensitivityResult['status'] = 'effective';
  if (Math.abs(pctKtChange) > 15 || pctStressChange > 50) {
    status = 'critical';
  } else if (efficiency > 2.0) {
    status = 'effective';
  } else if (efficiency < 0.3) {
    status = 'inefficient';
  }

  const elemRes = baseFea.elementResults.get(targetElem.id);

  return {
    elementId: targetElem.id,
    elementName: targetElem.name || `Member E${targetElem.id}`,
    category: targetElem.category || 'structure',
    lengthM: elemRes?.length || 0,
    baselineMassKg: baseFea.chassisMassKg,
    removedMassKg: removedFea.chassisMassKg,
    deltaMassKg,
    baselineKtNmDeg: baseTorsion.torsionalStiffnessNmPerDeg,
    removedKtNmDeg: removedTorsion.torsionalStiffnessNmPerDeg,
    deltaKtPercent: pctKtChange,
    baselineStressMpa: baseFea.maxStressMpa,
    removedStressMpa: removedFea.maxStressMpa,
    deltaStressPercent: pctStressChange,
    structuralEfficiency: efficiency,
    status,
  };
}

/**
 * Structural Optimization:
 * Searches candidate tube combinations to minimize chassis mass
 * subject to user-defined Factor of Safety and Torsional Stiffness constraints.
 */
export function optimizeChassis(
  nodes: Node3D[],
  elements: BeamElement[],
  materialsMap: Map<string, Material>,
  bcs: BoundaryCondition[],
  loads: NodalLoad[],
  minFoSConstraint = 1.8,
  minKtConstraintNmDeg = 1000,
  maxDispConstraintMm = 4.5
): OptimizationCandidate[] {
  // Baseline run
  const defaultSections = new Map<string, CrossSection>([
    ['sec_hoop', createCircularTubeSection('sec_hoop', '1.0x0.095', 0.0254, 0.00241)],
    ['sec_brace', createCircularTubeSection('sec_brace', '1.0x0.065', 0.0254, 0.00165)],
  ]);
  const baseFea = solveFEA(nodes, elements, materialsMap, defaultSections, bcs, loads);
  const baseMass = baseFea.chassisMassKg;

  const candidateGauges = [
    { name: 'Ultra-Lightweight Gauge', tHoop: 0.0020, tBrace: 0.0010, dHoop: 0.0254, dBrace: 0.0222 },
    { name: 'FSAE Rules Minimum', tHoop: 0.00241, tBrace: 0.00124, dHoop: 0.0254, dBrace: 0.0254 },
    { name: 'Balanced 4130 Spaceframe', tHoop: 0.00241, tBrace: 0.00165, dHoop: 0.0254, dBrace: 0.0254 },
    { name: 'High-Rigidity / Endurance', tHoop: 0.0028, tBrace: 0.0020, dHoop: 0.028, dBrace: 0.0254 },
    { name: 'Aluminum 6061-T6 Oversized Tube', tHoop: 0.0030, tBrace: 0.0025, dHoop: 0.035, dBrace: 0.030, matId: 'mat_al_6061_t6' },
    { name: 'Docol R8 High-Tensile Steel Gauge', tHoop: 0.0018, tBrace: 0.0012, dHoop: 0.0254, dBrace: 0.0254, matId: 'mat_docol_r8' },
  ];

  const candidates: OptimizationCandidate[] = [];

  for (let i = 0; i < candidateGauges.length; i++) {
    const g = candidateGauges[i];
    const secMap = new Map<string, CrossSection>([
      ['sec_main_hoop', createCircularTubeSection('sec_main_hoop', 'Hoop', g.dHoop, g.tHoop)],
      ['sec_front_hoop', createCircularTubeSection('sec_front_hoop', 'Hoop', g.dHoop, g.tHoop)],
      ['sec_roll_hoop_bracing', createCircularTubeSection('sec_roll_hoop_bracing', 'SIS/Brace', g.dBrace, g.tBrace)],
      ['sec_front_bulkhead', createCircularTubeSection('sec_front_bulkhead', 'FBH', g.dBrace, g.tBrace)],
      ['sec_secondary_bracing', createCircularTubeSection('sec_secondary_bracing', 'Brace', g.dBrace, g.tBrace)],
    ]);

    const activeMatId = g.matId || 'mat_chromoly_4130';
    const activeMat = materialsMap.get(activeMatId) || STANDARD_MATERIALS[0];
    const trialMatMap = new Map<string, Material>([[activeMatId, activeMat]]);
    const trialElements = elements.map((el) => ({ ...el, materialId: activeMatId }));

    try {
      const fea = solveFEA(nodes, trialElements, trialMatMap, secMap, bcs, loads);
      const tor = runTorsionalRigidityAnalysis(nodes, trialElements, trialMatMap, secMap, 1000);

      const isFeasible =
        fea.minFactorOfSafety >= minFoSConstraint &&
        tor.torsionalStiffnessNmPerDeg >= minKtConstraintNmDeg &&
        fea.maxDisplacementMm <= maxDispConstraintMm;

      const massReduction = ((baseMass - fea.chassisMassKg) / baseMass) * 100;

      candidates.push({
        id: `opt_cand_${i + 1}`,
        description: g.name,
        wallThicknessMm: Number((g.tBrace * 1000).toFixed(2)),
        outerDiameterMm: Number((g.dHoop * 1000).toFixed(1)),
        materialName: activeMat.name.split(' ')[0],
        massKg: Number(fea.chassisMassKg.toFixed(2)),
        maxStressMpa: Number(fea.maxStressMpa.toFixed(1)),
        maxDispMm: Number(fea.maxDisplacementMm.toFixed(2)),
        minFoS: Number(fea.minFactorOfSafety.toFixed(2)),
        torsionalStiffnessNmDeg: Number(tor.torsionalStiffnessNmPerDeg.toFixed(1)),
        isFeasible,
        massReductionPercent: Number(massReduction.toFixed(1)),
      });
    } catch {
      // Infeasible configuration
    }
  }

  // Sort candidates by mass ascending (feasible first)
  candidates.sort((a, b) => {
    if (a.isFeasible && !b.isFeasible) return -1;
    if (!a.isFeasible && b.isFeasible) return 1;
    return a.massKg - b.massKg;
  });

  return candidates;
}
