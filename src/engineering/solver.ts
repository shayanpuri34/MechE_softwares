/**
 * 3D Finite Element Analysis (FEA) Engine & Linear System Solver
 * Assembles global stiffness matrix, enforces boundary conditions, solves K*u = F,
 * and recovers nodal displacements, reaction forces, element internal forces, and stresses.
 */
import {
  BeamElement,
  BoundaryCondition,
  CrossSection,
  ElementResult,
  FEAResult,
  Material,
  Node3D,
  NodeDisplacement,
  NodalLoad,
  ReactionForce,
  Vector3D,
} from '../types/engineering';
import { computeLocalStiffnessMatrix } from './beamElement';
import { calculateShearModulus } from './materials';
import {
  computeTransformation,
  transformGlobalDisplacementsToLocal,
  transformLocalStiffnessToGlobal,
} from './transformation';

export interface ModelValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates model connectivity, geometry, materials, and boundary conditions
 */
export function validateChassisModel(
  nodes: Node3D[],
  elements: BeamElement[],
  materials: Map<string, Material>,
  sections: Map<string, CrossSection>,
  boundaryConditions: BoundaryCondition[],
  loads: NodalLoad[]
): ModelValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!nodes || nodes.length < 2) {
    errors.push('Model must contain at least 2 nodes.');
    return { isValid: false, errors, warnings };
  }

  if (!elements || elements.length < 1) {
    errors.push('Model must contain at least 1 beam element.');
    return { isValid: false, errors, warnings };
  }

  const nodeMap = new Map<number, Node3D>();
  for (const n of nodes) {
    if (nodeMap.has(n.id)) {
      errors.push(`Duplicate Node ID detected: N${n.id}.`);
    }
    nodeMap.set(n.id, n);
  }

  // Check for coincident nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      const dist = Math.sqrt(
        Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2) + Math.pow(n1.z - n2.z, 2)
      );
      if (dist < 1e-5) {
        warnings.push(
          `Nodes N${n1.id} and N${n2.id} have nearly identical coordinates (distance = ${(dist * 1000).toFixed(3)} mm).`
        );
      }
    }
  }

  const connectedNodes = new Set<number>();
  for (const elem of elements) {
    if (!nodeMap.has(elem.nodeStart)) {
      errors.push(`Element E${elem.id} references non-existent start Node N${elem.nodeStart}.`);
    }
    if (!nodeMap.has(elem.nodeEnd)) {
      errors.push(`Element E${elem.id} references non-existent end Node N${elem.nodeEnd}.`);
    }
    if (elem.nodeStart === elem.nodeEnd) {
      errors.push(`Element E${elem.id} connects Node N${elem.nodeStart} to itself (zero length).`);
    }

    if (!materials.has(elem.materialId)) {
      errors.push(`Element E${elem.id} references unknown material ID '${elem.materialId}'.`);
    }
    if (!sections.has(elem.sectionId)) {
      errors.push(`Element E${elem.id} references unknown section ID '${elem.sectionId}'.`);
    }

    connectedNodes.add(elem.nodeStart);
    connectedNodes.add(elem.nodeEnd);
  }

  // Check for orphan / unconnected nodes
  for (const n of nodes) {
    if (!connectedNodes.has(n.id)) {
      warnings.push(`Node N${n.id} is isolated (not connected to any beam element).`);
    }
  }

  // Check boundary conditions
  if (!boundaryConditions || boundaryConditions.length === 0) {
    errors.push('No boundary conditions defined. The chassis model will undergo unconstrained rigid-body motion.');
  } else {
    let constrainedTranslationalDofs = 0;
    for (const bc of boundaryConditions) {
      if (bc.ux) constrainedTranslationalDofs++;
      if (bc.uy) constrainedTranslationalDofs++;
      if (bc.uz) constrainedTranslationalDofs++;
    }
    if (constrainedTranslationalDofs < 3) {
      warnings.push(
        `Only ${constrainedTranslationalDofs} translational degrees of freedom are constrained. At least 3 non-collinear constraints are typically required to prevent rigid body motion.`
      );
    }
  }

  // Check loads
  if (!loads || loads.length === 0) {
    warnings.push('No loads applied in active load case. System will solve for zero displacement.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Solves a dense linear system A * x = b using LU decomposition with partial pivoting (LUP).
 * Handles matrix size up to 1000 DOFs with high numerical stability.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Clone A and b to prevent mutating callers
  const a: number[][] = A.map((row) => row.slice());
  const x = new Array(n).fill(0);
  const p: number[] = new Array(n);
  for (let i = 0; i < n; i++) p[i] = i;

  // LUP Factorization
  for (let i = 0; i < n; i++) {
    let maxVal = 0;
    let pivotRow = i;
    for (let k = i; k < n; k++) {
      const val = Math.abs(a[k][i]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = k;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error(
        `Singular stiffness matrix encountered at DOF ${i}. The structural model is unstable or under-constrained. ` +
        `Check boundary conditions to ensure all rigid-body modes (translations and rotations) are adequately restrained.`
      );
    }

    // Row swap in A and P
    if (pivotRow !== i) {
      const tempRow = a[i];
      a[i] = a[pivotRow];
      a[pivotRow] = tempRow;

      const tempP = p[i];
      p[i] = p[pivotRow];
      p[pivotRow] = tempP;
    }

    for (let j = i + 1; j < n; j++) {
      a[j][i] /= a[i][i];
      const factor = a[j][i];
      for (let k = i + 1; k < n; k++) {
        a[j][k] -= factor * a[i][k];
      }
    }
  }

  // Forward substitution: L * y = P * b
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[p[i]];
    for (let k = 0; k < i; k++) {
      sum -= a[i][k] * y[k];
    }
    y[i] = sum;
  }

  // Backward substitution: U * x = y
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) {
      sum -= a[i][k] * x[k];
    }
    x[i] = sum / a[i][i];
  }

  return x;
}

/**
 * Full Finite Element Solver Execution Pipeline
 */
export function solveFEA(
  nodes: Node3D[],
  elements: BeamElement[],
  materialsMap: Map<string, Material>,
  sectionsMap: Map<string, CrossSection>,
  boundaryConditions: BoundaryCondition[],
  loads: NodalLoad[],
  loadCaseId = 'default',
  loadCaseName = 'Standard Load'
): FEAResult {
  const startTime = performance.now();

  // Validate model
  const validation = validateChassisModel(
    nodes,
    elements,
    materialsMap,
    sectionsMap,
    boundaryConditions,
    loads
  );

  if (!validation.isValid) {
    throw new Error(`FEA Validation Failed:\n${validation.errors.join('\n')}`);
  }

  // 1. Build node index mapping (0 to N-1)
  const nodeIndexMap = new Map<number, number>();
  const indexToNodeMap = new Map<number, Node3D>();
  nodes.forEach((node, idx) => {
    nodeIndexMap.set(node.id, idx);
    indexToNodeMap.set(idx, node);
  });

  const numNodes = nodes.length;
  const numDOFs = numNodes * 6;

  // 2. Initialize global stiffness matrix K (numDOFs x numDOFs) and load vector F
  const K: number[][] = [];
  for (let i = 0; i < numDOFs; i++) {
    K.push(new Array(numDOFs).fill(0));
  }
  const F = new Array(numDOFs).fill(0);

  // 3. Assemble element stiffness matrices into global K
  let totalMass = 0;
  const elementDataList: Array<{
    element: BeamElement;
    L: number;
    mass: number;
    T: number[][];
    localK: number[][];
    E: number;
    G: number;
    section: CrossSection;
    material: Material;
    dofIndices: number[];
  }> = [];

  for (const elem of elements) {
    const n1 = nodes.find((n) => n.id === elem.nodeStart)!;
    const n2 = nodes.find((n) => n.id === elem.nodeEnd)!;
    const mat = materialsMap.get(elem.materialId)!;
    const sec = sectionsMap.get(elem.sectionId)!;

    const G = calculateShearModulus(mat.E, mat.poisson);
    const trans = computeTransformation(n1, n2);
    const stiffness = computeLocalStiffnessMatrix(
      mat.E,
      G,
      sec.area,
      sec.Iy || sec.I,
      sec.Iz || sec.I,
      sec.J,
      trans.length
    );

    const elemMass = trans.length * sec.area * mat.density;
    totalMass += elemMass;

    const globalElemK = transformLocalStiffnessToGlobal(stiffness.localK, trans.transformationMatrix);

    const idx1 = nodeIndexMap.get(elem.nodeStart)!;
    const idx2 = nodeIndexMap.get(elem.nodeEnd)!;

    // 12 global DOFs for this element: 6 for node 1, 6 for node 2
    const dofIndices = [
      idx1 * 6, idx1 * 6 + 1, idx1 * 6 + 2, idx1 * 6 + 3, idx1 * 6 + 4, idx1 * 6 + 5,
      idx2 * 6, idx2 * 6 + 1, idx2 * 6 + 2, idx2 * 6 + 3, idx2 * 6 + 4, idx2 * 6 + 5,
    ];

    for (let r = 0; r < 12; r++) {
      const gRow = dofIndices[r];
      for (let c = 0; c < 12; c++) {
        const gCol = dofIndices[c];
        K[gRow][gCol] += globalElemK[r][c];
      }
    }

    elementDataList.push({
      element: elem,
      L: trans.length,
      mass: elemMass,
      T: trans.transformationMatrix,
      localK: stiffness.localK,
      E: mat.E,
      G,
      section: sec,
      material: mat,
      dofIndices,
    });
  }

  // 4. Assemble Applied Loads into global F
  let totalFx = 0;
  let totalFy = 0;
  let totalFz = 0;

  for (const load of loads) {
    const nodeIdx = nodeIndexMap.get(load.nodeId);
    if (nodeIdx !== undefined) {
      const baseDof = nodeIdx * 6;
      F[baseDof + 0] += load.fx;
      F[baseDof + 1] += load.fy;
      F[baseDof + 2] += load.fz;
      if (load.mx) F[baseDof + 3] += load.mx;
      if (load.my) F[baseDof + 4] += load.my;
      if (load.mz) F[baseDof + 5] += load.mz;

      totalFx += load.fx;
      totalFy += load.fy;
      totalFz += load.fz;
    }
  }

  // Preserve unmodified K and F for reaction calculations
  const KOriginal = K.map((row) => row.slice());
  const FOriginal = F.slice();

  // 5. Apply Boundary Conditions
  // For each constrained DOF k: zero row and column, set diagonal to 1.0, set F[k] = 0
  const constrainedDofSet = new Set<number>();

  for (const bc of boundaryConditions) {
    const nodeIdx = nodeIndexMap.get(bc.nodeId);
    if (nodeIdx === undefined) continue;

    const baseDof = nodeIdx * 6;
    const dofFlags = [bc.ux, bc.uy, bc.uz, bc.rx, bc.ry, bc.rz];

    for (let d = 0; d < 6; d++) {
      if (dofFlags[d]) {
        const dof = baseDof + d;
        constrainedDofSet.add(dof);
      }
    }
  }

  for (const dof of constrainedDofSet) {
    for (let j = 0; j < numDOFs; j++) {
      K[dof][j] = 0;
      K[j][dof] = 0;
    }
    K[dof][dof] = 1.0;
    F[dof] = 0.0;
  }

  // 6. Solve K * u = F
  const uGlobal = solveLinearSystem(K, F);

  // 7. Calculate Reactions: R = K_original * u - F_applied
  const reactionsMap = new Map<number, ReactionForce>();
  let totalRx = 0;
  let totalRy = 0;
  let totalRz = 0;

  nodes.forEach((node) => {
    const nodeIdx = nodeIndexMap.get(node.id)!;
    const baseDof = nodeIdx * 6;

    let rx = 0;
    let ry = 0;
    let rz = 0;
    let mx = 0;
    let my = 0;
    let mz = 0;

    for (let j = 0; j < numDOFs; j++) {
      rx += KOriginal[baseDof + 0][j] * uGlobal[j];
      ry += KOriginal[baseDof + 1][j] * uGlobal[j];
      rz += KOriginal[baseDof + 2][j] * uGlobal[j];
      mx += KOriginal[baseDof + 3][j] * uGlobal[j];
      my += KOriginal[baseDof + 4][j] * uGlobal[j];
      mz += KOriginal[baseDof + 5][j] * uGlobal[j];
    }

    rx -= FOriginal[baseDof + 0];
    ry -= FOriginal[baseDof + 1];
    rz -= FOriginal[baseDof + 2];
    mx -= FOriginal[baseDof + 3];
    my -= FOriginal[baseDof + 4];
    mz -= FOriginal[baseDof + 5];

    reactionsMap.set(node.id, {
      nodeId: node.id,
      fx: rx,
      fy: ry,
      fz: rz,
      mx,
      my,
      mz,
    });

    totalRx += rx;
    totalRy += ry;
    totalRz += rz;
  });

  // 8. Extract Node Displacements
  const displacementsMap = new Map<number, NodeDisplacement>();
  let maxDisp = 0;
  let maxDispNodeId = nodes[0].id;

  nodes.forEach((node) => {
    const idx = nodeIndexMap.get(node.id)!;
    const baseDof = idx * 6;
    const ux = uGlobal[baseDof + 0];
    const uy = uGlobal[baseDof + 1];
    const uz = uGlobal[baseDof + 2];
    const rx = uGlobal[baseDof + 3];
    const ry = uGlobal[baseDof + 4];
    const rz = uGlobal[baseDof + 5];
    const total = Math.sqrt(ux * ux + uy * uy + uz * uz);

    if (total > maxDisp) {
      maxDisp = total;
      maxDispNodeId = node.id;
    }

    displacementsMap.set(node.id, {
      nodeId: node.id,
      ux,
      uy,
      uz,
      rx,
      ry,
      rz,
      totalDisp: total,
    });
  });

  // 9. Recover Element Forces, Moments, and Stresses
  const elementResultsMap = new Map<number, ElementResult>();
  let maxStressPa = 0;
  let criticalElementId = elements[0].id;
  let minFoS = Infinity;

  for (const item of elementDataList) {
    const elem = item.element;
    const uElemGlobal = item.dofIndices.map((dof) => uGlobal[dof]);
    const uElemLocal = transformGlobalDisplacementsToLocal(uElemGlobal, item.T);

    // Local internal forces f_local = K_local * u_local
    const fLocal = new Array(12).fill(0);
    for (let r = 0; r < 12; r++) {
      let sum = 0;
      for (let c = 0; c < 12; c++) {
        sum += item.localK[r][c] * uElemLocal[c];
      }
      fLocal[r] = sum;
    }

    // Force conventions (at node 2 or internal equilibrium):
    // Axial force N: tension is positive (+fLocal[6] or -fLocal[0])
    const axialForce = fLocal[6];

    // Shear forces
    const shearY = Math.abs(fLocal[7]);
    const shearZ = Math.abs(fLocal[8]);

    // Torsion
    const torsion = Math.abs(fLocal[9]);

    // Bending moments at ends
    const my1 = fLocal[4];
    const mz1 = fLocal[5];
    const my2 = fLocal[10];
    const mz2 = fLocal[11];

    const mResultant1 = Math.sqrt(my1 * my1 + mz1 * mz1);
    const mResultant2 = Math.sqrt(my2 * my2 + mz2 * mz2);
    const maxBendingMoment = Math.max(mResultant1, mResultant2);

    // Stresses
    const sec = item.section;
    const mat = item.material;

    // Normal stress = axial + bending
    const axialStress = axialForce / sec.area; // Pa
    const bendingStress = (maxBendingMoment * sec.outerRadius) / sec.I; // Pa
    const maxNormalStress = Math.abs(axialStress) + bendingStress; // Pa

    // Torsional shear stress tau = T * c / J + transverse shear
    const torsionalShear = (torsion * sec.outerRadius) / sec.J;
    const transverseShear = (2 * Math.sqrt(shearY * shearY + shearZ * shearZ)) / sec.area;
    const totalShear = torsionalShear + transverseShear;

    // Von Mises stress = sqrt(sigma^2 + 3 * tau^2)
    const vonMises = Math.sqrt(Math.pow(maxNormalStress, 2) + 3 * Math.pow(totalShear, 2));

    // Factor of Safety: FoS = yieldStrength / vonMises
    let fos = 99.0;
    if (vonMises > 1e-3) {
      fos = mat.yieldStrength / vonMises;
    }
    const utilization = (vonMises / mat.yieldStrength) * 100;

    if (vonMises > maxStressPa) {
      maxStressPa = vonMises;
      criticalElementId = elem.id;
    }

    if (fos < minFoS) {
      minFoS = fos;
    }

    elementResultsMap.set(elem.id, {
      elementId: elem.id,
      length: item.L,
      mass: item.mass,
      axialForce,
      shearY,
      shearZ,
      torsion,
      bendingMy: Math.max(Math.abs(my1), Math.abs(my2)),
      bendingMz: Math.max(Math.abs(mz1), Math.abs(mz2)),
      maxBendingMoment,
      axialStress,
      bendingStress,
      maxNormalStress,
      torsionalShearStress: totalShear,
      vonMisesStress: vonMises,
      factorOfSafety: Math.min(fos, 99.9),
      utilization,
    });
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    success: true,
    loadCaseId,
    loadCaseName,
    timestamp: new Date().toISOString(),
    totalNodes: numNodes,
    totalElements: elements.length,
    totalDofs: numDOFs,
    constrainedDofs: constrainedDofSet.size,
    freeDofs: numDOFs - constrainedDofSet.size,
    chassisMassKg: totalMass,
    maxDisplacementMm: maxDisp * 1000,
    maxDisplacementNodeId: maxDispNodeId,
    maxStressMpa: maxStressPa / 1e6,
    criticalElementId,
    minFactorOfSafety: minFoS > 99 ? 99.0 : Number(minFoS.toFixed(2)),
    totalReactionForce: { x: totalRx, y: totalRy, z: totalRz },
    totalAppliedForce: { x: totalFx, y: totalFy, z: totalFz },
    nodeDisplacements: displacementsMap,
    elementResults: elementResultsMap,
    reactions: reactionsMap,
    warnings: validation.warnings,
    executionTimeMs: Number(executionTimeMs.toFixed(1)),
  };
}
