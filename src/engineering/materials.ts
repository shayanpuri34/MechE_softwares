/**
 * Material Database & Mechanics Calculations
 */
import { Material } from '../types/engineering';

/**
 * Predefined materials commonly evaluated in collegiate motorsports (FSAE / Formula Student)
 */
export const STANDARD_MATERIALS: Material[] = [
  {
    id: 'mat_chromoly_4130',
    name: 'AISI 4130 Chromoly Steel (Normalized)',
    description: 'Industry standard for tubular spaceframes. Exceptional strength-to-weight ratio, excellent weldability.',
    E: 205e9, // 205 GPa
    poisson: 0.29,
    density: 7850, // kg/m^3
    yieldStrength: 435e6, // 435 MPa
    ultimateStrength: 670e6, // 670 MPa
  },
  {
    id: 'mat_al_6061_t6',
    name: 'Aluminum 6061-T6',
    description: 'Lightweight alloy with 1/3 the density of steel. Low modulus (69 GPa) requires larger section sizes.',
    E: 68.9e9, // 68.9 GPa
    poisson: 0.33,
    density: 2700, // kg/m^3
    yieldStrength: 276e6, // 276 MPa
    ultimateStrength: 310e6, // 310 MPa
  },
  {
    id: 'mat_mild_steel_1020',
    name: 'Mild Steel AISI 1020 (DOM Tubing)',
    description: 'Drawn-over-mandrel low carbon steel tubing. Readily available, ductile, lower yield strength than 4130.',
    E: 200e9, // 200 GPa
    poisson: 0.30,
    density: 7850, // kg/m^3
    yieldStrength: 350e6, // 350 MPa
    ultimateStrength: 420e6, // 420 MPa
  },
  {
    id: 'mat_docol_r8',
    name: 'Docol R8 High-Strength Steel',
    description: 'Advanced dual-phase motorsport tube steel with ultra-high yield strength and minimal heat affected zone (HAZ) softening.',
    E: 210e9, // 210 GPa
    poisson: 0.30,
    density: 7850, // kg/m^3
    yieldStrength: 800e6, // 800 MPa
    ultimateStrength: 1000e6, // 1000 MPa
  },
  {
    id: 'mat_ti_6al_4v',
    name: 'Titanium Ti-6Al-4V (Grade 5)',
    description: 'High strength, medium modulus aerospace titanium alloy. Exceptional specific strength.',
    E: 114e9, // 114 GPa
    poisson: 0.34,
    density: 4430, // kg/m^3
    yieldStrength: 880e6, // 880 MPa
    ultimateStrength: 950e6, // 950 MPa
  },
];

/**
 * Calculate shear modulus G from Young's modulus and Poisson's ratio
 * G = E / (2 * (1 + nu))
 */
export function calculateShearModulus(E: number, poisson: number): number {
  if (poisson <= -1 || poisson >= 0.5) {
    throw new Error(`Poisson's ratio must be in the thermodynamic range (-1, 0.5), received: ${poisson}`);
  }
  return E / (2 * (1 + poisson));
}
