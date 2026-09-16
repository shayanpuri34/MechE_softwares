/**
 * Dedicated Formula SAE Chassis Torsional Rigidity Solver
 *
 * Simulates a standard physical torsional rigidity test rig:
 * - Fixes rear suspension pickup nodes in translations (UX, UY, UZ)
 * - Applies a pure vertical couple to the front left (+Fz) and front right (-Fz) suspension nodes
 * - Computes roll angle theta and torsional stiffness Kt in N*m/deg and N*m/rad.
 */
import {
  BeamElement,
  BoundaryCondition,
  CrossSection,
  Material,
  Node3D,
  NodalLoad,
} from '../types/engineering';
import { solveFEA } from './solver';

export interface TorsionTestResult {
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
  stiffnessToWeightRatio: number; // (N*m/deg) / kg
}

export function runTorsionalRigidityAnalysis(
  nodes: Node3D[],
  elements: BeamElement[],
  materialsMap: Map<string, Material>,
  sectionsMap: Map<string, CrossSection>,
  coupleForceN = 1000 // 1000 N applied on each side
): TorsionTestResult {
  // 1. Identify Front and Rear Suspension Pickup Nodes
  // In our coordinate system:
  // X: longitudinal (front is small X e.g. ~0 to 0.6m, rear is large X e.g. ~1.8 to 2.6m)
  // Y: lateral (-Y right, +Y left)
  // Z: vertical (+Z up)
  const suspensionNodes = nodes.filter((n) => n.isSuspensionPickup || n.category === 'suspension');

  let frontLeftNode: Node3D | undefined;
  let frontRightNode: Node3D | undefined;
  const rearNodes: Node3D[] = [];

  if (suspensionNodes.length >= 4) {
    // Sort by X ascending
    const sortedByX = [...suspensionNodes].sort((a, b) => a.x - b.x);
    // Front nodes have smallest X
    const frontGroup = sortedByX.slice(0, 4);
    const rearGroup = sortedByX.slice(4);

    // Front left has Y > 0, front right has Y < 0
    frontLeftNode = frontGroup.filter((n) => n.y > 0.05).sort((a, b) => b.y - a.y)[0] || frontGroup[0];
    frontRightNode = frontGroup.filter((n) => n.y < -0.05).sort((a, b) => a.y - b.y)[0] || frontGroup[1];
    rearNodes.push(...rearGroup);
  }

  // Fallback if not tagged
  if (!frontLeftNode || !frontRightNode || rearNodes.length < 2) {
    // Pick node with lowest X and positive Y for front left
    const sortedX = [...nodes].sort((a, b) => a.x - b.x);
    const frontHalf = sortedX.slice(0, Math.floor(nodes.length / 2));
    const rearHalf = sortedX.slice(Math.floor(nodes.length / 2));

    frontLeftNode = frontHalf.reduce((prev, curr) => (curr.y > prev.y ? curr : prev), frontHalf[0]);
    frontRightNode = frontHalf.reduce((prev, curr) => (curr.y < prev.y ? curr : prev), frontHalf[0]);
    rearNodes.push(...rearHalf.slice(-4));
  }

  const trackWidth = Math.abs(frontLeftNode.y - frontRightNode.y);
  if (trackWidth < 0.1) {
    throw new Error('Front track width between loading nodes is too small (< 100 mm).');
  }

  // Applied torque T = coupleForce * trackWidth
  const torqueApplied = coupleForceN * trackWidth;

  // Boundary conditions: Rear nodes constrained in translations UX, UY, UZ
  const bcs: BoundaryCondition[] = rearNodes.map((n) => ({
    nodeId: n.id,
    name: `Rear Fixity N${n.id}`,
    ux: true,
    uy: true,
    uz: true,
    rx: false,
    ry: false,
    rz: false,
  }));

  // Force couple: +coupleForce on Left, -coupleForce on Right
  const loads: NodalLoad[] = [
    {
      nodeId: frontLeftNode.id,
      fx: 0,
      fy: 0,
      fz: coupleForceN,
      description: 'Front Left Torsion Load (+Fz)',
    },
    {
      nodeId: frontRightNode.id,
      fx: 0,
      fy: 0,
      fz: -coupleForceN,
      description: 'Front Right Torsion Load (-Fz)',
    },
  ];

  const feaResult = solveFEA(
    nodes,
    elements,
    materialsMap,
    sectionsMap,
    bcs,
    loads,
    'torsion_test',
    'Torsional Rigidity Analysis'
  );

  const dispFL = feaResult.nodeDisplacements.get(frontLeftNode.id)?.uz || 0;
  const dispFR = feaResult.nodeDisplacements.get(frontRightNode.id)?.uz || 0;

  // Total relative vertical deflection delta_z = dispFL - dispFR
  const deltaZ = Math.abs(dispFL - dispFR);

  // Twist angle theta = delta_z / trackWidth (rad)
  const twistAngleRad = Math.max(deltaZ / trackWidth, 1e-9);
  const twistAngleDeg = (twistAngleRad * 180) / Math.PI;

  const torsionalStiffnessNmPerRad = torqueApplied / twistAngleRad;
  const torsionalStiffnessNmPerDeg = torqueApplied / twistAngleDeg;
  const stiffnessToWeightRatio = torsionalStiffnessNmPerDeg / feaResult.chassisMassKg;

  return {
    torqueAppliedNm: torqueApplied,
    coupleForceN,
    frontTrackWidthM: trackWidth,
    dispFrontLeftMm: dispFL * 1000,
    dispFrontRightMm: dispFR * 1000,
    twistAngleRad,
    twistAngleDeg,
    torsionalStiffnessNmPerRad,
    torsionalStiffnessNmPerDeg,
    chassisMassKg: feaResult.chassisMassKg,
    stiffnessToWeightRatio,
  };
}
