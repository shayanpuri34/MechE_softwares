/**
 * Cross-Section Geometric Properties
 * Implements mechanics of materials formulas for tubular chassis members.
 */
import { CrossSection } from '../types/engineering';

/**
 * Calculate circular tube geometric properties
 * @param outerDiameter Outer diameter in meters
 * @param wallThickness Wall thickness in meters
 * @param name Section identifier name
 * @param id Unique ID
 */
export function createCircularTubeSection(
  id: string,
  name: string,
  outerDiameter: number, // m
  wallThickness: number, // m
  fsaeCategory?: CrossSection['fsaeCategory']
): CrossSection {
  if (outerDiameter <= 0) {
    throw new Error(`Invalid outer diameter: ${outerDiameter * 1000} mm. Must be positive.`);
  }
  if (wallThickness <= 0) {
    throw new Error(`Invalid wall thickness: ${wallThickness * 1000} mm. Must be positive.`);
  }
  if (wallThickness >= outerDiameter / 2) {
    throw new Error(
      `Wall thickness (${wallThickness * 1000} mm) cannot exceed or equal outer radius (${(outerDiameter / 2) * 1000} mm).`
    );
  }

  const Do = outerDiameter;
  const t = wallThickness;
  const Di = Do - 2 * t;
  const c = Do / 2; // outer radius

  // Area A = pi/4 * (Do^2 - Di^2)
  const area = (Math.PI / 4) * (Math.pow(Do, 2) - Math.pow(Di, 2));

  // Second moment of area I = pi/64 * (Do^4 - Di^4)
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));

  // Polar moment of inertia J = pi/32 * (Do^4 - Di^4) = 2 * I for circular cross-sections
  const J = (Math.PI / 32) * (Math.pow(Do, 4) - Math.pow(Di, 4));

  return {
    id,
    name,
    type: 'circular_tube',
    outerDiameter: Do,
    wallThickness: t,
    area,
    I,
    Iy: I,
    Iz: I,
    J,
    outerRadius: c,
    innerDiameter: Di,
    fsaeCategory,
  };
}

/**
 * Standard Formula SAE tube sections based on FSAE SES (Structural Equivalency Spreadsheet) rules
 */
export const STANDARD_FSAE_SECTIONS: CrossSection[] = [
  createCircularTubeSection(
    'sec_main_hoop',
    'Main Hoop (1.000" x 0.095" / 25.4 x 2.41 mm)',
    0.0254, // 1 inch
    0.00241, // 0.095 inch
    'main_hoop'
  ),
  createCircularTubeSection(
    'sec_front_hoop',
    'Front Hoop (1.000" x 0.095" / 25.4 x 2.41 mm)',
    0.0254,
    0.00241,
    'front_hoop'
  ),
  createCircularTubeSection(
    'sec_roll_hoop_bracing',
    'Hoop Bracing & SIS (1.000" x 0.065" / 25.4 x 1.65 mm)',
    0.0254,
    0.00165,
    'roll_hoop_bracing'
  ),
  createCircularTubeSection(
    'sec_front_bulkhead',
    'Front Bulkhead Support (1.000" x 0.065" / 25.4 x 1.65 mm)',
    0.0254,
    0.00165,
    'front_bulkhead'
  ),
  createCircularTubeSection(
    'sec_secondary_bracing',
    'Secondary Bracing (1.000" x 0.049" / 25.4 x 1.24 mm)',
    0.0254,
    0.00124,
    'other'
  ),
  createCircularTubeSection(
    'sec_light_triangulation',
    'Light Triangulation (0.750" x 0.049" / 19.05 x 1.24 mm)',
    0.01905,
    0.00124,
    'other'
  ),
];

/**
 * Calculate mass per meter for a section and density
 */
export function getLinearMassDensity(section: CrossSection, densityKgM3: number): number {
  return section.area * densityKgM3;
}
