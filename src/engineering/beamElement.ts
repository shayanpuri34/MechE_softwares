/**
 * 3D Linear Elastic Beam Element Formulation (Euler-Bernoulli Frame Element)
 *
 * Each element has 12 degrees of freedom:
 * Node 1: [u1, v1, w1, rx1, ry1, rz1]  (DOFs 0-5)
 * Node 2: [u2, v2, w2, rx2, ry2, rz2]  (DOFs 6-11)
 *
 * Local coordinate system:
 * - x: Along beam axis from Node 1 to Node 2
 * - y: Principal cross-section axis 1 (orthogonal to beam axis)
 * - z: Principal cross-section axis 2 (orthogonal to x and y via right-hand rule)
 */

export interface ElementStiffnessData {
  localK: number[][]; // 12x12 local stiffness matrix
  L: number; // Length (m)
  EA_L: number; // Axial stiffness
  GJ_L: number; // Torsional stiffness
  EIy: number;
  EIz: number;
}

/**
 * Creates a zero-filled 12x12 matrix
 */
export function createMatrix12x12(): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < 12; i++) {
    m.push(new Array(12).fill(0));
  }
  return m;
}

/**
 * Assembles the 12x12 local frame stiffness matrix
 *
 * @param E Young's modulus (Pa)
 * @param G Shear modulus (Pa)
 * @param A Cross-sectional area (m^2)
 * @param Iy Second moment of area about local y-axis (m^4)
 * @param Iz Second moment of area about local z-axis (m^4)
 * @param J Torsional constant / polar moment (m^4)
 * @param L Element length (m)
 */
export function computeLocalStiffnessMatrix(
  E: number,
  G: number,
  A: number,
  Iy: number,
  Iz: number,
  J: number,
  L: number
): ElementStiffnessData {
  if (L <= 0) {
    throw new Error(`Invalid beam length L = ${L}. Beam length must be strictly positive.`);
  }

  const k = createMatrix12x12();

  const L2 = L * L;
  const L3 = L2 * L;

  // Axial stiffness: EA / L
  const kAxial = (E * A) / L;

  // Torsional stiffness: GJ / L
  const kTorsion = (G * J) / L;

  // Bending about local z-axis (causes transverse displacement v in y-direction):
  const k12_Iz = (12 * E * Iz) / L3;
  const k6_Iz = (6 * E * Iz) / L2;
  const k4_Iz = (4 * E * Iz) / L;
  const k2_Iz = (2 * E * Iz) / L;

  // Bending about local y-axis (causes transverse displacement w in z-direction):
  const k12_Iy = (12 * E * Iy) / L3;
  const k6_Iy = (6 * E * Iy) / L2;
  const k4_Iy = (4 * E * Iy) / L;
  const k2_Iy = (2 * E * Iy) / L;

  // --- DOFs: 0: u1, 1: v1, 2: w1, 3: rx1, 4: ry1, 5: rz1 ---
  // --- DOFs: 6: u2, 7: v2, 8: w2, 9: rx2, 10: ry2, 11: rz2 ---

  // 1. Axial terms (u1, u2) -> indices 0, 6
  k[0][0] = kAxial;
  k[0][6] = -kAxial;
  k[6][0] = -kAxial;
  k[6][6] = kAxial;

  // 2. Torsional terms (rx1, rx2) -> indices 3, 9
  k[3][3] = kTorsion;
  k[3][9] = -kTorsion;
  k[9][3] = -kTorsion;
  k[9][9] = kTorsion;

  // 3. Bending in xy plane (v1, rz1, v2, rz2) -> indices 1, 5, 7, 11
  k[1][1] = k12_Iz;
  k[1][5] = k6_Iz;
  k[1][7] = -k12_Iz;
  k[1][11] = k6_Iz;

  k[5][1] = k6_Iz;
  k[5][5] = k4_Iz;
  k[5][7] = -k6_Iz;
  k[5][11] = k2_Iz;

  k[7][1] = -k12_Iz;
  k[7][5] = -k6_Iz;
  k[7][7] = k12_Iz;
  k[7][11] = -k6_Iz;

  k[11][1] = k6_Iz;
  k[11][5] = k2_Iz;
  k[11][7] = -k6_Iz;
  k[11][11] = k4_Iz;

  // 4. Bending in xz plane (w1, ry1, w2, ry2) -> indices 2, 4, 8, 10
  // Note: Due to the right-hand rule (theta_y = -dw/dx), coupling signs are negative for ry1
  k[2][2] = k12_Iy;
  k[2][4] = -k6_Iy;
  k[2][8] = -k12_Iy;
  k[2][10] = -k6_Iy;

  k[4][2] = -k6_Iy;
  k[4][4] = k4_Iy;
  k[4][8] = k6_Iy;
  k[4][10] = k2_Iy;

  k[8][2] = -k12_Iy;
  k[8][4] = k6_Iy;
  k[8][8] = k12_Iy;
  k[8][10] = k6_Iy;

  k[10][2] = -k6_Iy;
  k[10][4] = k2_Iy;
  k[10][8] = k6_Iy;
  k[10][11] = 0;
  k[10][10] = k4_Iy;

  return {
    localK: k,
    L,
    EA_L: kAxial,
    GJ_L: kTorsion,
    EIy: E * Iy,
    EIz: E * Iz,
  };
}
