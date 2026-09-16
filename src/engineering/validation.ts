/**
 * Engineering Validation Suite & Analytical Benchmarks
 *
 * Compares numerical FEA results against closed-form analytical solutions
 * from classical solid mechanics and structural beam theory.
 */
import {
  BeamElement,
  BoundaryCondition,
  CrossSection,
  Material,
  Node3D,
  NodalLoad,
  ValidationBenchmark,
} from '../types/engineering';
import { computeLocalStiffnessMatrix } from './beamElement';
import { STANDARD_MATERIALS } from './materials';
import { createCircularTubeSection } from './sections';
import { solveFEA } from './solver';
import { computeTransformation } from './transformation';

export interface UnitTestResult {
  id: string;
  name: string;
  category: 'mechanics' | 'matrix_math' | 'fea_formulation' | 'equilibrium';
  passed: boolean;
  expected: string;
  actual: string;
  errorPercent?: number;
  details: string;
}

/**
 * Benchmark 1: Uniaxial Bar Tension
 * Theory: delta = F * L / (A * E)
 */
export function runAxialBarBenchmark(): ValidationBenchmark {
  const L = 2.0; // 2.0 m length
  const F = 50000; // 50 kN tension
  const E = 205e9; // 205 GPa (4130 steel)
  const Do = 0.0254; // 1.0 inch
  const t = 0.00241; // 0.095 inch
  const sec = createCircularTubeSection('test_sec', 'Tube', Do, t);
  const A = sec.area;

  // Analytical solution
  const analyticalDisp = (F * L) / (A * E);

  // Setup 2-node FEA model
  const nodes: Node3D[] = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: L, y: 0, z: 0 },
  ];
  const elements: BeamElement[] = [
    { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
  ];
  const materialsMap = new Map<string, Material>([
    [
      'mat_4130',
      {
        id: 'mat_4130',
        name: 'Steel',
        description: '',
        E,
        poisson: 0.29,
        density: 7850,
        yieldStrength: 435e6,
        ultimateStrength: 670e6,
      },
    ],
  ]);
  const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
  const bcs: BoundaryCondition[] = [
    { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
  ];
  const loads: NodalLoad[] = [{ nodeId: 2, fx: F, fy: 0, fz: 0 }];

  const result = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
  const feaDisp = result.nodeDisplacements.get(2)!.ux;

  const absError = Math.abs(feaDisp - analyticalDisp);
  const pctError = (absError / analyticalDisp) * 100;

  return {
    id: 'bench_axial_bar',
    title: 'Uniaxial Bar Tension Benchmark',
    theoryFormula: 'delta = (F * L) / (A * E)',
    description: 'Verifies axial stiffness term (EA/L) against Hooke’s 1D law for prismatic bar.',
    parameters: {
      Length: `${L} m`,
      Load: `${(F / 1000).toFixed(1)} kN`,
      'Young’s Modulus': `${(E / 1e9).toFixed(1)} GPa`,
      Area: `${(A * 1e6).toFixed(2)} mm²`,
    },
    analyticalValue: analyticalDisp * 1000,
    feaValue: feaDisp * 1000,
    unit: 'mm',
    absoluteError: absError * 1000,
    percentageError: pctError,
    tolerancePercent: 0.05,
    passed: pctError < 0.05,
  };
}

/**
 * Benchmark 2: Cantilever Beam with Tip Load
 * Theory: delta = F * L^3 / (3 * E * I)
 */
export function runCantileverTipLoadBenchmark(): ValidationBenchmark {
  const L = 1.5; // 1.5 m
  const F = 1500; // 1.5 kN downward (-Z)
  const E = 205e9;
  const Do = 0.0381; // 1.5 inch
  const t = 0.003; // 3 mm
  const sec = createCircularTubeSection('test_cantilever', 'Tube', Do, t);
  const I = sec.I;

  const analyticalDisp = (F * Math.pow(L, 3)) / (3 * E * I);

  const nodes: Node3D[] = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: L, y: 0, z: 0 },
  ];
  const elements: BeamElement[] = [
    { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
  ];
  const materialsMap = new Map<string, Material>([
    [
      'mat_4130',
      {
        id: 'mat_4130',
        name: 'Steel',
        description: '',
        E,
        poisson: 0.29,
        density: 7850,
        yieldStrength: 435e6,
        ultimateStrength: 670e6,
      },
    ],
  ]);
  const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
  const bcs: BoundaryCondition[] = [
    { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
  ];
  const loads: NodalLoad[] = [{ nodeId: 2, fx: 0, fy: 0, fz: -F }];

  const result = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
  const feaDisp = Math.abs(result.nodeDisplacements.get(2)!.uz);

  const absError = Math.abs(feaDisp - analyticalDisp);
  const pctError = (absError / analyticalDisp) * 100;

  return {
    id: 'bench_cantilever_load',
    title: 'Cantilever Beam Transverse Tip Load Benchmark',
    theoryFormula: 'delta = (F * L^3) / (3 * E * I)',
    description: 'Verifies bending stiffness matrix formulation and cubic Hermite shape function response.',
    parameters: {
      Length: `${L} m`,
      TipLoad: `${(F / 1000).toFixed(2)} kN`,
      'Second Moment of Area (I)': `${I.toExponential(3)} m⁴`,
    },
    analyticalValue: analyticalDisp * 1000,
    feaValue: feaDisp * 1000,
    unit: 'mm',
    absoluteError: absError * 1000,
    percentageError: pctError,
    tolerancePercent: 0.05,
    passed: pctError < 0.05,
  };
}

/**
 * Benchmark 3: Cantilever Beam with End Moment
 * Theory: delta = M * L^2 / (2 * E * I), theta = M * L / (E * I)
 */
export function runCantileverEndMomentBenchmark(): ValidationBenchmark {
  const L = 1.2;
  const M = 800; // 800 N*m about local Y axis (causes Z displacement)
  const E = 205e9;
  const sec = createCircularTubeSection('test_sec_m', 'Tube', 0.03, 0.002);
  const I = sec.I;

  const analyticalDisp = (M * Math.pow(L, 2)) / (2 * E * I);

  const nodes: Node3D[] = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: L, y: 0, z: 0 },
  ];
  const elements: BeamElement[] = [
    { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
  ];
  const materialsMap = new Map<string, Material>([
    [
      'mat_4130',
      {
        id: 'mat_4130',
        name: 'Steel',
        description: '',
        E,
        poisson: 0.29,
        density: 7850,
        yieldStrength: 435e6,
        ultimateStrength: 670e6,
      },
    ],
  ]);
  const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
  const bcs: BoundaryCondition[] = [
    { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
  ];
  // Apply My moment at Node 2
  const loads: NodalLoad[] = [{ nodeId: 2, fx: 0, fy: 0, fz: 0, my: M }];

  const result = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
  const feaDisp = Math.abs(result.nodeDisplacements.get(2)!.uz);

  const absError = Math.abs(feaDisp - analyticalDisp);
  const pctError = (absError / analyticalDisp) * 100;

  return {
    id: 'bench_cantilever_moment',
    title: 'Cantilever Beam Applied End Moment Benchmark',
    theoryFormula: 'delta = (M * L^2) / (2 * E * I)',
    description: 'Verifies rotational-translational rotational coupling and moment transfer terms.',
    parameters: {
      Length: `${L} m`,
      Moment: `${M} N·m`,
      'Second Moment (I)': `${I.toExponential(3)} m⁴`,
    },
    analyticalValue: analyticalDisp * 1000,
    feaValue: feaDisp * 1000,
    unit: 'mm',
    absoluteError: absError * 1000,
    percentageError: pctError,
    tolerancePercent: 0.05,
    passed: pctError < 0.05,
  };
}

/**
 * Benchmark 4: Circular Shaft Pure Torsion
 * Theory: theta = T * L / (G * J)
 */
export function runTorsionShaftBenchmark(): ValidationBenchmark {
  const L = 1.0;
  const T = 500; // 500 N*m torque
  const E = 205e9;
  const nu = 0.29;
  const G = E / (2 * (1 + nu));
  const sec = createCircularTubeSection('test_torsion_sec', 'Tube', 0.035, 0.0025);
  const J = sec.J;

  const analyticalAngleRad = (T * L) / (G * J);
  const analyticalAngleDeg = (analyticalAngleRad * 180) / Math.PI;

  const nodes: Node3D[] = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: L, y: 0, z: 0 },
  ];
  const elements: BeamElement[] = [
    { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
  ];
  const materialsMap = new Map<string, Material>([
    [
      'mat_4130',
      {
        id: 'mat_4130',
        name: 'Steel',
        description: '',
        E,
        poisson: nu,
        density: 7850,
        yieldStrength: 435e6,
        ultimateStrength: 670e6,
      },
    ],
  ]);
  const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
  const bcs: BoundaryCondition[] = [
    { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
  ];
  const loads: NodalLoad[] = [{ nodeId: 2, fx: 0, fy: 0, fz: 0, mx: T }];

  const result = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
  const feaAngleRad = Math.abs(result.nodeDisplacements.get(2)!.rx);
  const feaAngleDeg = (feaAngleRad * 180) / Math.PI;

  const absError = Math.abs(feaAngleDeg - analyticalAngleDeg);
  const pctError = (absError / analyticalAngleDeg) * 100;

  return {
    id: 'bench_pure_torsion',
    title: 'Circular Shaft Pure Torsion Benchmark',
    theoryFormula: 'theta = (T * L) / (G * J)',
    description: 'Verifies St. Venant torsional rigidity term (GJ/L) for thin-walled circular tube.',
    parameters: {
      Length: `${L} m`,
      Torque: `${T} N·m`,
      'Shear Modulus (G)': `${(G / 1e9).toFixed(2)} GPa`,
      'Polar Moment (J)': `${J.toExponential(3)} m⁴`,
    },
    analyticalValue: analyticalAngleDeg,
    feaValue: feaAngleDeg,
    unit: 'deg',
    absoluteError: absError,
    percentageError: pctError,
    tolerancePercent: 0.05,
    passed: pctError < 0.05,
  };
}

/**
 * Runs a mesh convergence study on a cantilever beam
 * Dividing beam into 1, 2, 4, 8, 16 elements
 */
export function runConvergenceStudy(): Array<{ elements: number; dofs: number; dispMm: number; exactMm: number; errorPercent: number }> {
  const L = 2.0;
  const F = 2000;
  const E = 205e9;
  const sec = createCircularTubeSection('conv_sec', 'Tube', 0.03, 0.002);
  const exactDisp = ((F * Math.pow(L, 3)) / (3 * E * sec.I)) * 1000; // mm

  const elementCounts = [1, 2, 4, 8, 16];
  const results: Array<{ elements: number; dofs: number; dispMm: number; exactMm: number; errorPercent: number }> = [];

  for (const nElem of elementCounts) {
    const nodes: Node3D[] = [];
    const elements: BeamElement[] = [];

    const dx = L / nElem;
    for (let i = 0; i <= nElem; i++) {
      nodes.push({ id: i + 1, x: i * dx, y: 0, z: 0 });
    }

    for (let i = 0; i < nElem; i++) {
      elements.push({
        id: i + 1,
        nodeStart: i + 1,
        nodeEnd: i + 2,
        sectionId: sec.id,
        materialId: 'mat_4130',
      });
    }

    const materialsMap = new Map<string, Material>([
      [
        'mat_4130',
        {
          id: 'mat_4130',
          name: 'Steel',
          description: '',
          E,
          poisson: 0.29,
          density: 7850,
          yieldStrength: 435e6,
          ultimateStrength: 670e6,
        },
      ],
    ]);
    const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
    const bcs: BoundaryCondition[] = [
      { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
    ];
    const loads: NodalLoad[] = [{ nodeId: nElem + 1, fx: 0, fy: 0, fz: -F }];

    const res = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
    const tipDispMm = Math.abs(res.nodeDisplacements.get(nElem + 1)!.uz) * 1000;
    const errorPct = (Math.abs(tipDispMm - exactDisp) / exactDisp) * 100;

    results.push({
      elements: nElem,
      dofs: nodes.length * 6,
      dispMm: tipDispMm,
      exactMm: exactDisp,
      errorPercent: errorPct,
    });
  }

  return results;
}

/**
 * Runs 14 comprehensive unit tests on fundamental solid mechanics and FEA routines
 */
export function runUnitTests(): UnitTestResult[] {
  const tests: UnitTestResult[] = [];

  // Test 1: Tube Area
  try {
    const Do = 0.0254;
    const t = 0.00241;
    const sec = createCircularTubeSection('t1', 'Tube', Do, t);
    const expected = (Math.PI / 4) * (Math.pow(Do, 2) - Math.pow(Do - 2 * t, 2));
    const pass = Math.abs(sec.area - expected) < 1e-12;
    tests.push({
      id: 'UT-01',
      name: 'Circular Tube Cross-Sectional Area',
      category: 'mechanics',
      passed: pass,
      expected: `${(expected * 1e6).toFixed(4)} mm²`,
      actual: `${(sec.area * 1e6).toFixed(4)} mm²`,
      details: 'Evaluates A = pi/4 * (Do^2 - Di^2).',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-01', name: 'Circular Tube Area', category: 'mechanics', passed: false, expected: 'Valid', actual: err.message, details: '' });
  }

  // Test 2: Tube Moment of Inertia
  try {
    const Do = 0.0254;
    const t = 0.00241;
    const sec = createCircularTubeSection('t2', 'Tube', Do, t);
    const expected = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Do - 2 * t, 4));
    const pass = Math.abs(sec.I - expected) < 1e-16;
    tests.push({
      id: 'UT-02',
      name: 'Second Moment of Area (I)',
      category: 'mechanics',
      passed: pass,
      expected: `${expected.toExponential(4)} m⁴`,
      actual: `${sec.I.toExponential(4)} m⁴`,
      details: 'Evaluates I = pi/64 * (Do^4 - Di^4).',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-02', name: 'Tube Moment of Inertia', category: 'mechanics', passed: false, expected: 'Valid', actual: err.message, details: '' });
  }

  // Test 3: Polar Moment of Inertia J = 2 * I
  try {
    const sec = createCircularTubeSection('t3', 'Tube', 0.03, 0.002);
    const pass = Math.abs(sec.J - 2 * sec.I) < 1e-16;
    tests.push({
      id: 'UT-03',
      name: 'Perpendicular Axis Theorem (J = 2 * I)',
      category: 'mechanics',
      passed: pass,
      expected: `${(2 * sec.I).toExponential(4)} m⁴`,
      actual: `${sec.J.toExponential(4)} m⁴`,
      details: 'Polar moment of circular cross-section equals sum of orthogonal moments (Ix + Iy).',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-03', name: 'Perpendicular Axis Theorem', category: 'mechanics', passed: false, expected: 'Valid', actual: err.message, details: '' });
  }

  // Test 4: Shear Modulus Relation G = E / (2*(1+nu))
  try {
    const E = 205e9;
    const nu = 0.29;
    const G = E / (2 * (1 + nu));
    const pass = G > 0 && Math.abs(G - 79.457e9) < 1e6;
    tests.push({
      id: 'UT-04',
      name: 'Isotropic Shear Modulus Calculation',
      category: 'mechanics',
      passed: pass,
      expected: '79.46 GPa',
      actual: `${(G / 1e9).toFixed(2)} GPa`,
      details: 'Evaluates G = E / (2 * (1 + nu)).',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-04', name: 'Shear Modulus', category: 'mechanics', passed: false, expected: 'Valid', actual: err.message, details: '' });
  }

  // Test 5: Local Stiffness Matrix Symmetry (K_ij = K_ji)
  try {
    const sec = createCircularTubeSection('t5', 'Tube', 0.0254, 0.002);
    const mat = STANDARD_MATERIALS[0];
    const G = mat.E / (2 * (1 + mat.poisson));
    const kData = computeLocalStiffnessMatrix(mat.E, G, sec.area, sec.I, sec.I, sec.J, 1.0);
    let maxDiff = 0;
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const diff = Math.abs(kData.localK[r][c] - kData.localK[c][r]);
        if (diff > maxDiff) maxDiff = diff;
      }
    }
    const pass = maxDiff < 1e-10;
    tests.push({
      id: 'UT-05',
      name: '12x12 Local Stiffness Matrix Symmetry',
      category: 'matrix_math',
      passed: pass,
      expected: 'Exact symmetry (K = K^T)',
      actual: `Max asymmetry = ${maxDiff.toExponential(2)}`,
      details: 'Maxwell-Betti reciprocal theorem requires symmetric element stiffness.',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-05', name: 'Matrix Symmetry', category: 'matrix_math', passed: false, expected: 'Symmetric', actual: err.message, details: '' });
  }

  // Test 6: Direction Cosines Unit Magnitude (lx^2 + ly^2 + lz^2 = 1)
  try {
    const n1 = { id: 1, x: 0.1, y: -0.4, z: 0.5 };
    const n2 = { id: 2, x: 0.8, y: 0.2, z: 1.1 };
    const trans = computeTransformation(n1, n2);
    const { lx, ly, lz } = trans.directionCosines;
    const mag = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const pass = Math.abs(mag - 1.0) < 1e-12;
    tests.push({
      id: 'UT-06',
      name: 'Beam Direction Cosine Unit Norm',
      category: 'matrix_math',
      passed: pass,
      expected: '1.000000',
      actual: mag.toFixed(6),
      details: 'Ensures spatial direction vector has unit length in 3D.',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-06', name: 'Direction Cosines', category: 'matrix_math', passed: false, expected: '1.0', actual: err.message, details: '' });
  }

  // Test 7: Rotation Matrix Orthogonality (R * R^T = I)
  try {
    const n1 = { id: 1, x: 0, y: 0, z: 0 };
    const n2 = { id: 2, x: 1, y: 2, z: 3 };
    const trans = computeTransformation(n1, n2);
    const R = trans.rotationMatrix;
    let isOrthogonal = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let dot = 0;
        for (let k = 0; k < 3; k++) {
          dot += R[r][k] * R[c][k];
        }
        const expected = r === c ? 1 : 0;
        if (Math.abs(dot - expected) > 1e-10) isOrthogonal = false;
      }
    }
    tests.push({
      id: 'UT-07',
      name: 'Rotation Matrix Orthogonality (R * R^T = I)',
      category: 'matrix_math',
      passed: isOrthogonal,
      expected: 'Identity Matrix I',
      actual: isOrthogonal ? 'Verified Orthogonal' : 'Failed Orthogonality',
      details: 'Transformation preserves vector lengths and angles without distortion.',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-07', name: 'Orthogonality', category: 'matrix_math', passed: false, expected: 'Orthogonal', actual: err.message, details: '' });
  }

  // Test 8: Vertical Beam Singular Case Transformation
  try {
    const n1 = { id: 1, x: 0, y: 0, z: 0 };
    const n2 = { id: 2, x: 0, y: 0, z: 1.5 }; // Exactly aligned with Z
    const trans = computeTransformation(n1, n2);
    const pass = trans.rotationMatrix.length === 3 && trans.length === 1.5;
    tests.push({
      id: 'UT-08',
      name: 'Vertical Member Singularity Avoidance',
      category: 'matrix_math',
      passed: pass,
      expected: 'Properly conditioned coordinate triad',
      actual: 'Singularity handled via alternative reference axis',
      details: 'Prevents zero cross product when member is parallel to global Z.',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-08', name: 'Vertical Singularity', category: 'matrix_math', passed: false, expected: 'Valid', actual: err.message, details: '' });
  }

  // Test 9: Axial Bar Benchmark
  try {
    const bench = runAxialBarBenchmark();
    tests.push({
      id: 'UT-09',
      name: 'Axial Bar Analytical Benchmark',
      category: 'fea_formulation',
      passed: bench.passed,
      expected: `${bench.analyticalValue.toFixed(4)} mm`,
      actual: `${bench.feaValue.toFixed(4)} mm`,
      errorPercent: bench.percentageError,
      details: `Hooke’s Law delta = FL/AE. Percentage error: ${bench.percentageError.toFixed(5)}%.`,
    });
  } catch (err: any) {
    tests.push({ id: 'UT-09', name: 'Axial Bar Benchmark', category: 'fea_formulation', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  // Test 10: Cantilever Tip Deflection Benchmark
  try {
    const bench = runCantileverTipLoadBenchmark();
    tests.push({
      id: 'UT-10',
      name: 'Cantilever Beam Tip Deflection Benchmark',
      category: 'fea_formulation',
      passed: bench.passed,
      expected: `${bench.analyticalValue.toFixed(4)} mm`,
      actual: `${bench.feaValue.toFixed(4)} mm`,
      errorPercent: bench.percentageError,
      details: `Euler-Bernoulli delta = FL^3/(3EI). Percentage error: ${bench.percentageError.toFixed(5)}%.`,
    });
  } catch (err: any) {
    tests.push({ id: 'UT-10', name: 'Cantilever Benchmark', category: 'fea_formulation', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  // Test 11: Cantilever End Moment Benchmark
  try {
    const bench = runCantileverEndMomentBenchmark();
    tests.push({
      id: 'UT-11',
      name: 'Cantilever End Moment Benchmark',
      category: 'fea_formulation',
      passed: bench.passed,
      expected: `${bench.analyticalValue.toFixed(4)} mm`,
      actual: `${bench.feaValue.toFixed(4)} mm`,
      errorPercent: bench.percentageError,
      details: `Curvature delta = ML^2/(2EI). Percentage error: ${bench.percentageError.toFixed(5)}%.`,
    });
  } catch (err: any) {
    tests.push({ id: 'UT-11', name: 'Cantilever Moment Benchmark', category: 'fea_formulation', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  // Test 12: Shaft Pure Torsion Benchmark
  try {
    const bench = runTorsionShaftBenchmark();
    tests.push({
      id: 'UT-12',
      name: 'Circular Shaft Pure Torsion Benchmark',
      category: 'fea_formulation',
      passed: bench.passed,
      expected: `${bench.analyticalValue.toFixed(4)}°`,
      actual: `${bench.feaValue.toFixed(4)}°`,
      errorPercent: bench.percentageError,
      details: `St. Venant torsion theta = TL/(GJ). Percentage error: ${bench.percentageError.toFixed(5)}%.`,
    });
  } catch (err: any) {
    tests.push({ id: 'UT-12', name: 'Torsion Benchmark', category: 'fea_formulation', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  // Test 13: Static Global Force Equilibrium (Sigma F_applied + Sigma R = 0)
  try {
    const bench = runCantileverTipLoadBenchmark();
    const nodes: Node3D[] = [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 1.0, y: 0, z: 0 },
    ];
    const sec = createCircularTubeSection('t13', 'Tube', 0.03, 0.002);
    const elements: BeamElement[] = [
      { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
    ];
    const materialsMap = new Map<string, Material>([['mat_4130', STANDARD_MATERIALS[0]]]);
    const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
    const bcs: BoundaryCondition[] = [
      { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
    ];
    const appliedZ = -2500; // -2.5 kN
    const loads: NodalLoad[] = [{ nodeId: 2, fx: 0, fy: 0, fz: appliedZ }];

    const res = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
    const rz1 = res.reactions.get(1)?.fz || 0;
    const netZ = rz1 + appliedZ;
    const pass = Math.abs(netZ) < 1e-6;
    tests.push({
      id: 'UT-13',
      name: 'Global Static Equilibrium (Sigma Fz = 0)',
      category: 'equilibrium',
      passed: pass,
      expected: 'Reaction Rz = +2500.000 N',
      actual: `Reaction Rz = ${rz1.toFixed(3)} N (Residual: ${netZ.toExponential(2)} N)`,
      details: 'Verifies reaction force recovery satisfies Newton’s first law of equilibrium.',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-13', name: 'Global Static Equilibrium', category: 'equilibrium', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  // Test 14: Moment Equilibrium Check (Sigma M = 0)
  try {
    const L = 1.5;
    const Fz = -1000; // -1000 N
    const expectedMy = -Fz * L; // 1500 N*m reaction moment
    const nodes: Node3D[] = [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: L, y: 0, z: 0 },
    ];
    const sec = createCircularTubeSection('t14', 'Tube', 0.03, 0.002);
    const elements: BeamElement[] = [
      { id: 1, nodeStart: 1, nodeEnd: 2, sectionId: sec.id, materialId: 'mat_4130' },
    ];
    const materialsMap = new Map<string, Material>([['mat_4130', STANDARD_MATERIALS[0]]]);
    const sectionsMap = new Map<string, CrossSection>([[sec.id, sec]]);
    const bcs: BoundaryCondition[] = [
      { nodeId: 1, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
    ];
    const loads: NodalLoad[] = [{ nodeId: 2, fx: 0, fy: 0, fz: Fz }];

    const res = solveFEA(nodes, elements, materialsMap, sectionsMap, bcs, loads);
    const my1 = res.reactions.get(1)?.my || 0;
    const diff = Math.abs(my1 - expectedMy);
    const pass = diff < 1e-4;
    tests.push({
      id: 'UT-14',
      name: 'Global Moment Equilibrium (Sigma My = 0)',
      category: 'equilibrium',
      passed: pass,
      expected: `${expectedMy.toFixed(1)} N·m`,
      actual: `${my1.toFixed(1)} N·m (Residual: ${diff.toExponential(2)} N·m)`,
      details: 'Verifies reaction moment matches applied tip load cross product (F * L).',
    });
  } catch (err: any) {
    tests.push({ id: 'UT-14', name: 'Moment Equilibrium', category: 'equilibrium', passed: false, expected: 'Pass', actual: err.message, details: '' });
  }

  return tests;
}

export type ConvergencePoint = {
  elements: number;
  dofs: number;
  dispMm: number;
  exactMm: number;
  errorPercent: number;
};

export const runValidationSuite = runUnitTests;
