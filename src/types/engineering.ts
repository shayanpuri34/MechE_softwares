/**
 * Formula SAE Chassis FEA Analysis & Structural Optimization Platform
 * Core TypeScript Data Models and Types
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Node3D {
  id: number;
  name?: string;
  x: number; // meters
  y: number; // meters
  z: number; // meters
  isSuspensionPickup?: boolean;
  category?: 'front_bulkhead' | 'front_hoop' | 'main_hoop' | 'rear_structure' | 'side_impact' | 'suspension' | 'floor' | 'other';
}

export interface Material {
  id: string;
  name: string;
  description: string;
  E: number; // Young's modulus (Pa)
  poisson: number; // Poisson's ratio (dimensionless)
  density: number; // Density (kg/m^3)
  yieldStrength: number; // Yield strength (Pa)
  ultimateStrength: number; // Ultimate strength (Pa)
  isCustom?: boolean;
}

export interface CrossSection {
  id: string;
  name: string;
  type: 'circular_tube' | 'rectangular_tube' | 'solid_circular';
  outerDiameter: number; // meters
  wallThickness: number; // meters
  // Calculated geometric properties (SI units)
  area: number; // m^2
  I: number; // Second moment of area (m^4)
  Iy?: number; // m^4 (for rectangular)
  Iz?: number; // m^4 (for rectangular)
  J: number; // Torsional constant / polar moment (m^4)
  outerRadius: number; // meters (c = D_o / 2)
  innerDiameter: number; // meters
  fsaeCategory?: 'main_hoop' | 'front_hoop' | 'roll_hoop_bracing' | 'side_impact' | 'front_bulkhead' | 'other';
}

export interface BeamElement {
  id: number;
  name?: string;
  nodeStart: number;
  nodeEnd: number;
  sectionId: string;
  materialId: string;
  category?:
    | 'main_hoop'
    | 'front_hoop'
    | 'side_impact'
    | 'bulkhead'
    | 'bracing'
    | 'frame_rail'
    | 'suspension_support'
    | 'rear_structure'
    | 'triangulation'
    | 'structure';
}

export interface BoundaryCondition {
  nodeId: number;
  name?: string;
  // 6 DOFs: true = constrained / fixed (displacement = 0), false = free
  ux: boolean;
  uy: boolean;
  uz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
  fixUx?: boolean;
  fixUy?: boolean;
  fixUz?: boolean;
  fixRx?: boolean;
  fixRy?: boolean;
  fixRz?: boolean;
}

export interface NodalLoad {
  nodeId: number;
  fx: number; // Force in X (N)
  fy: number; // Force in Y (N)
  fz: number; // Force in Z (N)
  mx?: number; // Moment in X (N*m)
  my?: number; // Moment in Y (N*m)
  mz?: number; // Moment in Z (N*m)
  description?: string;
}

export type LoadCaseType =
  | 'vertical_bump'
  | 'lateral_cornering'
  | 'longitudinal_braking'
  | 'combined'
  | 'torsion_test'
  | 'custom';

export interface LoadCase {
  id: string;
  name: string;
  type: LoadCaseType;
  description: string;
  vehicleMassKg: number;
  gFactor: number;
  frontDistribution: number; // e.g. 0.45 front, 0.55 rear
  loads: NodalLoad[];
  boundaryConditions: BoundaryCondition[];
}

export interface NodeDisplacement {
  nodeId: number;
  ux: number; // m
  uy: number; // m
  uz: number; // m
  rx: number; // rad
  ry: number; // rad
  rz: number; // rad
  totalDisp: number; // m = sqrt(ux^2 + uy^2 + uz^2)
}

export interface ElementResult {
  elementId: number;
  length: number; // m
  mass: number; // kg
  axialForce: number; // N (positive = tension, negative = compression)
  shearY: number; // N
  shearZ: number; // N
  torsion: number; // N*m
  bendingMy: number; // N*m
  bendingMz: number; // N*m
  maxBendingMoment: number; // N*m = sqrt(My^2 + Mz^2)
  axialStress: number; // Pa (N / A)
  bendingStress: number; // Pa (M * c / I)
  maxNormalStress: number; // Pa (|axialStress| + bendingStress)
  torsionalShearStress: number; // Pa (T * c / J)
  vonMisesStress: number; // Pa (sqrt(sigma^2 + 3 * tau^2))
  factorOfSafety: number; // yieldStrength / maxNormalStress
  utilization: number; // maxNormalStress / yieldStrength * 100 (%)
  bucklingRatio?: number; // Euler critical load ratio P / P_cr
}

export interface ReactionForce {
  nodeId: number;
  fx: number; // N
  fy: number; // N
  fz: number; // N
  mx: number; // N*m
  my: number; // N*m
  mz: number; // N*m
}

export interface FEAResult {
  success: boolean;
  loadCaseId: string;
  loadCaseName: string;
  timestamp: string;
  totalNodes: number;
  totalElements: number;
  totalDofs: number;
  constrainedDofs: number;
  freeDofs: number;
  chassisMassKg: number;
  maxDisplacementMm: number;
  maxDisplacementNodeId: number;
  maxStressMpa: number;
  criticalElementId: number;
  minFactorOfSafety: number;
  totalReactionForce: Vector3D; // N
  totalAppliedForce: Vector3D; // N
  nodeDisplacements: Map<number, NodeDisplacement>;
  elementResults: Map<number, ElementResult>;
  reactions: Map<number, ReactionForce>;
  torsionalStiffness?: {
    torqueNm: number;
    angleRad: number;
    angleDeg: number;
    ktNmPerRad: number;
    ktNmPerDeg: number;
  };
  warnings?: string[];
  executionTimeMs: number;
}

export interface ValidationBenchmark {
  id: string;
  title: string;
  theoryFormula: string;
  description: string;
  parameters: Record<string, string | number>;
  analyticalValue: number;
  feaValue: number;
  unit: string;
  absoluteError: number;
  percentageError: number;
  tolerancePercent: number;
  passed: boolean;
}

export interface DesignSnapshot {
  id: string;
  name: string;
  timestamp: string | number;
  description?: string;
  notes?: string;
  massKg: number;
  maxStressMpa: number;
  maxDispMm?: number;
  maxDisplacementMm?: number;
  minFoS?: number;
  minFactorOfSafety: number;
  torsionalStiffnessNmPerDeg?: number;
  torsionalStiffnessNmDeg: number;
  nodeCount?: number;
  elementCount?: number;
}

export interface TorsionalAnalysisResult {
  torqueAppliedNm: number;
  coupleForceN: number;
  frontTrackWidthM: number;
  dispFrontLeftMm: number;
  dispFrontRightMm: number;
  twistAngleRad: number;
  twistAngleDeg: number;
  torsionalStiffnessNmPerRad: number;
  torsionalStiffnessNmPerDeg: number;
  chassisMassKg: number;
  stiffnessToWeightRatio: number;
}

export interface OptimizationCandidate {
  id: string;
  description: string;
  wallThicknessMm: number;
  outerDiameterMm: number;
  materialName: string;
  massKg: number;
  maxStressMpa: number;
  maxDispMm: number;
  minFoS: number;
  torsionalStiffnessNmDeg: number;
  isFeasible: boolean;
  massReductionPercent: number;
}

export interface ChassisProject {
  id: string;
  name: string;
  vehicleType: string;
  units: 'SI' | 'Metric_Engineering';
  created: string;
  notes: string;
  nodes: Node3D[];
  elements: BeamElement[];
  materials: Material[];
  sections: CrossSection[];
  loadCases: LoadCase[];
  activeLoadCaseId: string;
}
