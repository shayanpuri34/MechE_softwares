/**
 * 3D Coordinate Transformations for Frame Elements
 * Computes the 12x12 transformation matrix and transforms local element stiffness matrices into global coordinates.
 */
import { Node3D } from '../types/engineering';
import { createMatrix12x12 } from './beamElement';

export interface TransformationData {
  length: number;
  directionCosines: { lx: number; ly: number; lz: number };
  rotationMatrix: number[][]; // 3x3
  transformationMatrix: number[][]; // 12x12
}

/**
 * Normalizes a 3D vector
 */
function normalizeVector(v: [number, number, number]): [number, number, number] {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (mag < 1e-12) {
    throw new Error('Vector magnitude near zero during normalization.');
  }
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

/**
 * Cross product of two 3D vectors
 */
function crossProduct(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Computes 3D transformation matrices for a beam element between two nodes
 */
export function computeTransformation(node1: Node3D, node2: Node3D): TransformationData {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  const dz = node2.z - node1.z;

  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < 1e-6) {
    throw new Error(
      `Zero-length beam element detected between Node N${node1.id} (${node1.x.toFixed(3)}, ${node1.y.toFixed(3)}, ${node1.z.toFixed(3)}) ` +
      `and Node N${node2.id} (${node2.x.toFixed(3)}, ${node2.y.toFixed(3)}, ${node2.z.toFixed(3)}). Distance = ${(length * 1000).toFixed(4)} mm.`
    );
  }

  // Local x-axis is unit vector along the member from Node 1 to Node 2
  const lx = dx / length;
  const ly = dy / length;
  const lz = dz / length;
  const xl: [number, number, number] = [lx, ly, lz];

  // Robust selection of reference vector to establish local y and z axes
  // If element is nearly aligned with global Z, use global Y as reference
  let vRef: [number, number, number];
  if (Math.abs(lx) < 1e-4 && Math.abs(ly) < 1e-4) {
    vRef = [0, 1, 0];
  } else {
    vRef = [0, 0, 1];
  }

  // Local y-axis is perpendicular to local x and reference vector
  const ylRaw = crossProduct(vRef, xl);
  const yl = normalizeVector(ylRaw);

  // Local z-axis completes the right-handed orthonormal triad: z_l = x_l x y_l
  const zl = crossProduct(xl, yl);

  // 3x3 Rotation matrix R where rows are the local unit vectors xl, yl, zl expressed in global coordinates
  // u_local = R * u_global
  const R: number[][] = [
    [xl[0], xl[1], xl[2]],
    [yl[0], yl[1], yl[2]],
    [zl[0], zl[1], zl[2]],
  ];

  // 12x12 Transformation matrix T = diag(R, R, R, R)
  const T = createMatrix12x12();
  for (let block = 0; block < 4; block++) {
    const offset = block * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        T[offset + r][offset + c] = R[r][c];
      }
    }
  }

  return {
    length,
    directionCosines: { lx, ly, lz },
    rotationMatrix: R,
    transformationMatrix: T,
  };
}

/**
 * Transforms local element stiffness matrix to global coordinates:
 * K_global = T^T * K_local * T
 */
export function transformLocalStiffnessToGlobal(
  localK: number[][],
  transformationMatrix: number[][]
): number[][] {
  const T = transformationMatrix;
  const temp = createMatrix12x12();
  const globalK = createMatrix12x12();

  // Step 1: temp = K_local * T
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      let sum = 0;
      for (let k = 0; k < 12; k++) {
        sum += localK[i][k] * T[k][j];
      }
      temp[i][j] = sum;
    }
  }

  // Step 2: globalK = T^T * temp
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      let sum = 0;
      for (let k = 0; k < 12; k++) {
        sum += T[k][i] * temp[k][j]; // T[k][i] is (T^T)[i][k]
      }
      globalK[i][j] = sum;
    }
  }

  return globalK;
}

/**
 * Transforms global displacement vector of an element into local coordinates:
 * u_local = T * u_global
 */
export function transformGlobalDisplacementsToLocal(
  uGlobal: number[],
  transformationMatrix: number[][]
): number[] {
  const uLocal = new Array(12).fill(0);
  const T = transformationMatrix;

  for (let i = 0; i < 12; i++) {
    let sum = 0;
    for (let j = 0; j < 12; j++) {
      sum += T[i][j] * uGlobal[j];
    }
    uLocal[i] = sum;
  }

  return uLocal;
}
