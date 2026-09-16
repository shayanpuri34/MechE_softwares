/**
 * Preloaded Example Formula SAE Tubular Spaceframe Chassis
 *
 * Modeled according to collegiate Formula SAE / Formula Student design conventions:
 * - Front Bulkhead (FBH)
 * - Front Bulkhead Support & Suspension Bay
 * - Front Hoop (FH) & Front Hoop Bracing
 * - Side Impact Structure (triangulated 3-rail SIS)
 * - Main Hoop (MH) & Main Hoop Rear Bracing
 * - Harness Bar & Diagonal Roll-Hoop Triangulation
 * - Rear Engine Bay & Rear Suspension Sub-Structure
 */
import {
  BeamElement,
  BoundaryCondition,
  ChassisProject,
  CrossSection,
  LoadCase,
  Material,
  NodalLoad,
  Node3D,
} from '../types/engineering';
import { STANDARD_MATERIALS } from '../engineering/materials';
import { STANDARD_FSAE_SECTIONS } from '../engineering/sections';

export function createExampleFSAEProject(): ChassisProject {
  const materials: Material[] = [...STANDARD_MATERIALS];
  const sections: CrossSection[] = [...STANDARD_FSAE_SECTIONS];

  // 41 Nodes representing the complete FSAE spaceframe
  // Dimensions in meters: X = Longitudinal, Y = Lateral, Z = Vertical
  const nodes: Node3D[] = [
    // --- Front Bulkhead (X = 0.00 m) ---
    { id: 1, name: 'FBH Lower Right', x: 0.0, y: -0.16, z: 0.08, category: 'front_bulkhead' },
    { id: 2, name: 'FBH Lower Left', x: 0.0, y: 0.16, z: 0.08, category: 'front_bulkhead' },
    { id: 3, name: 'FBH Upper Right', x: 0.0, y: -0.16, z: 0.36, category: 'front_bulkhead' },
    { id: 4, name: 'FBH Upper Left', x: 0.0, y: 0.16, z: 0.36, category: 'front_bulkhead' },

    // --- Front Suspension Bay - Forward Pickups (X = 0.22 m) ---
    { id: 5, name: 'Front Susp Low Fwd R', x: 0.22, y: -0.22, z: 0.09, isSuspensionPickup: true, category: 'suspension' },
    { id: 6, name: 'Front Susp Low Fwd L', x: 0.22, y: 0.22, z: 0.09, isSuspensionPickup: true, category: 'suspension' },
    { id: 7, name: 'Front Susp Up Fwd R', x: 0.22, y: -0.20, z: 0.38, isSuspensionPickup: true, category: 'suspension' },
    { id: 8, name: 'Front Susp Up Fwd L', x: 0.22, y: 0.20, z: 0.38, isSuspensionPickup: true, category: 'suspension' },

    // --- Front Suspension Bay - Rearward Pickups (X = 0.44 m) ---
    { id: 9, name: 'Front Susp Low Aft R', x: 0.44, y: -0.24, z: 0.10, isSuspensionPickup: true, category: 'suspension' },
    { id: 10, name: 'Front Susp Low Aft L', x: 0.44, y: 0.24, z: 0.10, isSuspensionPickup: true, category: 'suspension' },
    { id: 11, name: 'Front Susp Up Aft R', x: 0.44, y: -0.21, z: 0.40, isSuspensionPickup: true, category: 'suspension' },
    { id: 12, name: 'Front Susp Up Aft L', x: 0.44, y: 0.21, z: 0.40, isSuspensionPickup: true, category: 'suspension' },

    // --- Front Bulkhead Support Station (X = 0.60 m) ---
    { id: 13, name: 'FBS Lower Right', x: 0.60, y: -0.26, z: 0.10, category: 'floor' },
    { id: 14, name: 'FBS Lower Left', x: 0.60, y: 0.26, z: 0.10, category: 'floor' },
    { id: 15, name: 'FBS Upper Right', x: 0.60, y: -0.23, z: 0.44, category: 'side_impact' },
    { id: 16, name: 'FBS Upper Left', x: 0.60, y: 0.23, z: 0.44, category: 'side_impact' },

    // --- Front Hoop (FH) at Driver Dashboard (X = 0.95 m) ---
    { id: 17, name: 'FH Base Right', x: 0.95, y: -0.28, z: 0.10, category: 'front_hoop' },
    { id: 18, name: 'FH Base Left', x: 0.95, y: 0.28, z: 0.10, category: 'front_hoop' },
    { id: 19, name: 'FH SIS Right', x: 0.95, y: -0.28, z: 0.38, category: 'front_hoop' },
    { id: 20, name: 'FH SIS Left', x: 0.95, y: 0.28, z: 0.38, category: 'front_hoop' },
    { id: 21, name: 'FH Shoulder Right', x: 0.95, y: -0.24, z: 0.66, category: 'front_hoop' },
    { id: 22, name: 'FH Shoulder Left', x: 0.95, y: 0.24, z: 0.66, category: 'front_hoop' },
    { id: 23, name: 'FH Top Apex', x: 0.95, y: 0.0, z: 0.72, category: 'front_hoop' },

    // --- Main Hoop (MH) behind Driver (X = 1.45 m) ---
    { id: 24, name: 'MH Base Right', x: 1.45, y: -0.32, z: 0.10, category: 'main_hoop' },
    { id: 25, name: 'MH Base Left', x: 1.45, y: 0.32, z: 0.10, category: 'main_hoop' },
    { id: 26, name: 'MH SIS Mid Right', x: 1.45, y: -0.32, z: 0.38, category: 'main_hoop' },
    { id: 27, name: 'MH SIS Mid Left', x: 1.45, y: 0.32, z: 0.38, category: 'main_hoop' },
    { id: 28, name: 'MH Harness Bar Right', x: 1.45, y: -0.28, z: 0.70, category: 'main_hoop' },
    { id: 29, name: 'MH Harness Bar Left', x: 1.45, y: 0.28, z: 0.70, category: 'main_hoop' },
    { id: 30, name: 'MH Top Corner Right', x: 1.45, y: -0.19, z: 1.04, category: 'main_hoop' },
    { id: 31, name: 'MH Top Corner Left', x: 1.45, y: 0.19, z: 1.04, category: 'main_hoop' },
    { id: 32, name: 'MH Top Apex', x: 1.45, y: 0.0, z: 1.08, category: 'main_hoop' },

    // --- Rear Subframe Station / Engine Bay Fwd (X = 1.85 m) ---
    { id: 33, name: 'Engine Bay Low Right', x: 1.85, y: -0.28, z: 0.10, isSuspensionPickup: true, category: 'rear_structure' },
    { id: 34, name: 'Engine Bay Low Left', x: 1.85, y: 0.28, z: 0.10, isSuspensionPickup: true, category: 'rear_structure' },
    { id: 35, name: 'Engine Bay Up Right', x: 1.85, y: -0.25, z: 0.42, isSuspensionPickup: true, category: 'rear_structure' },
    { id: 36, name: 'Engine Bay Up Left', x: 1.85, y: 0.25, z: 0.42, isSuspensionPickup: true, category: 'rear_structure' },
    { id: 37, name: 'MH Rear Brace Apex Node', x: 1.85, y: 0.0, z: 0.48, category: 'rear_structure' },

    // --- Rear Suspension & Differential Mounts (X = 2.25 m) ---
    { id: 38, name: 'Rear Susp Low Aft R', x: 2.25, y: -0.22, z: 0.10, isSuspensionPickup: true, category: 'suspension' },
    { id: 39, name: 'Rear Susp Low Aft L', x: 2.25, y: 0.22, z: 0.10, isSuspensionPickup: true, category: 'suspension' },
    { id: 40, name: 'Rear Susp Up Aft R', x: 2.25, y: -0.20, z: 0.38, isSuspensionPickup: true, category: 'suspension' },
    { id: 41, name: 'Rear Susp Up Aft L', x: 2.25, y: 0.20, z: 0.38, isSuspensionPickup: true, category: 'suspension' },
  ];

  // Section references:
  // sec_main_hoop: 1.0" x 0.095"
  // sec_front_hoop: 1.0" x 0.095"
  // sec_roll_hoop_bracing: 1.0" x 0.065"
  // sec_front_bulkhead: 1.0" x 0.065"
  // sec_secondary_bracing: 1.0" x 0.049"

  const elements: BeamElement[] = [
    // 1. Front Bulkhead Ring (Nodes 1, 2, 3, 4)
    { id: 1, name: 'FBH Bottom', nodeStart: 1, nodeEnd: 2, sectionId: 'sec_front_bulkhead', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 2, name: 'FBH Left', nodeStart: 2, nodeEnd: 4, sectionId: 'sec_front_bulkhead', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 3, name: 'FBH Top', nodeStart: 4, nodeEnd: 3, sectionId: 'sec_front_bulkhead', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 4, name: 'FBH Right', nodeStart: 3, nodeEnd: 1, sectionId: 'sec_front_bulkhead', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 5, name: 'FBH Diagonal', nodeStart: 1, nodeEnd: 4, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 2. Front Bulkhead to Suspension Bay - Lower Rails
    { id: 6, name: 'Floor Rail FBH-Fwd R', nodeStart: 1, nodeEnd: 5, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 7, name: 'Floor Rail FBH-Fwd L', nodeStart: 2, nodeEnd: 6, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 8, name: 'Floor Rail Susp Bay R', nodeStart: 5, nodeEnd: 9, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 9, name: 'Floor Rail Susp Bay L', nodeStart: 6, nodeEnd: 10, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 10, name: 'Floor Rail Susp-FBS R', nodeStart: 9, nodeEnd: 13, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 11, name: 'Floor Rail Susp-FBS L', nodeStart: 10, nodeEnd: 14, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },

    // 3. Front Bulkhead to Suspension Bay - Upper Rails
    { id: 12, name: 'Upper Rail FBH-Fwd R', nodeStart: 3, nodeEnd: 7, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 13, name: 'Upper Rail FBH-Fwd L', nodeStart: 4, nodeEnd: 8, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 14, name: 'Upper Rail Susp Bay R', nodeStart: 7, nodeEnd: 11, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 15, name: 'Upper Rail Susp Bay L', nodeStart: 8, nodeEnd: 12, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 16, name: 'Upper Rail Susp-FBS R', nodeStart: 11, nodeEnd: 15, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 17, name: 'Upper Rail Susp-FBS L', nodeStart: 12, nodeEnd: 16, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },

    // 4. Front Suspension Bay Lateral Crossmembers & Vertical Struts
    { id: 18, name: 'Susp Low Fwd Crossmember', nodeStart: 5, nodeEnd: 6, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 19, name: 'Susp Up Fwd Crossmember', nodeStart: 7, nodeEnd: 8, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 20, name: 'Susp Fwd Strut R', nodeStart: 5, nodeEnd: 7, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 21, name: 'Susp Fwd Strut L', nodeStart: 6, nodeEnd: 8, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },

    { id: 22, name: 'Susp Low Aft Crossmember', nodeStart: 9, nodeEnd: 10, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 23, name: 'Susp Up Aft Crossmember', nodeStart: 11, nodeEnd: 12, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 24, name: 'Susp Aft Strut R', nodeStart: 9, nodeEnd: 11, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },
    { id: 25, name: 'Susp Aft Strut L', nodeStart: 10, nodeEnd: 12, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'suspension_support' },

    // 5. Front Bulkhead Support Triangulation
    { id: 26, name: 'FBS Low Crossmember', nodeStart: 13, nodeEnd: 14, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 27, name: 'FBS Up Crossmember', nodeStart: 15, nodeEnd: 16, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 28, name: 'FBS Strut R', nodeStart: 13, nodeEnd: 15, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 29, name: 'FBS Strut L', nodeStart: 14, nodeEnd: 16, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bulkhead' },
    { id: 30, name: 'FBS Diagonal Brace', nodeStart: 13, nodeEnd: 16, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // Front Bay Side Diagonals
    { id: 31, name: 'Front Bay Diag R1', nodeStart: 1, nodeEnd: 7, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 32, name: 'Front Bay Diag L1', nodeStart: 2, nodeEnd: 8, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 33, name: 'Front Bay Diag R2', nodeStart: 5, nodeEnd: 11, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 34, name: 'Front Bay Diag L2', nodeStart: 6, nodeEnd: 12, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 35, name: 'Front Bay Diag R3', nodeStart: 9, nodeEnd: 15, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 36, name: 'Front Bay Diag L3', nodeStart: 10, nodeEnd: 16, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 6. Front Hoop (Nodes 17 through 23)
    { id: 37, name: 'FH Lower Leg R', nodeStart: 17, nodeEnd: 19, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 38, name: 'FH Lower Leg L', nodeStart: 18, nodeEnd: 20, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 39, name: 'FH Mid Leg R', nodeStart: 19, nodeEnd: 21, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 40, name: 'FH Mid Leg L', nodeStart: 20, nodeEnd: 22, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 41, name: 'FH Crown R', nodeStart: 21, nodeEnd: 23, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 42, name: 'FH Crown L', nodeStart: 22, nodeEnd: 23, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 43, name: 'FH Dash Bar Crossmember', nodeStart: 21, nodeEnd: 22, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },
    { id: 44, name: 'FH Base Crossmember', nodeStart: 17, nodeEnd: 18, sectionId: 'sec_front_hoop', materialId: 'mat_chromoly_4130', category: 'front_hoop' },

    // 7. Front Hoop Forward Bracing (Rules require FH bracing forward to chassis structure)
    { id: 45, name: 'FH Fwd Brace R', nodeStart: 21, nodeEnd: 15, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 46, name: 'FH Fwd Brace L', nodeStart: 22, nodeEnd: 16, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 8. Cockpit Floor & Side Rails (FBS to FH)
    { id: 47, name: 'Floor Rail FBS-FH R', nodeStart: 13, nodeEnd: 17, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 48, name: 'Floor Rail FBS-FH L', nodeStart: 14, nodeEnd: 18, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 49, name: 'Upper Rail FBS-FH R', nodeStart: 15, nodeEnd: 19, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 50, name: 'Upper Rail FBS-FH L', nodeStart: 16, nodeEnd: 20, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 51, name: 'Side Diag FBS-FH R', nodeStart: 13, nodeEnd: 19, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 52, name: 'Side Diag FBS-FH L', nodeStart: 14, nodeEnd: 20, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 9. Side Impact Structure (SIS) - Cockpit Bay between FH and MH
    // FSAE Rules: Upper member, lower member, and diagonal member forming triangulated beam
    { id: 53, name: 'Cockpit Floor Rail R', nodeStart: 17, nodeEnd: 24, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 54, name: 'Cockpit Floor Rail L', nodeStart: 18, nodeEnd: 25, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 55, name: 'Cockpit SIS Upper Rail R', nodeStart: 19, nodeEnd: 26, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 56, name: 'Cockpit SIS Upper Rail L', nodeStart: 20, nodeEnd: 27, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 57, name: 'Cockpit SIS Diagonal R', nodeStart: 17, nodeEnd: 26, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 58, name: 'Cockpit SIS Diagonal L', nodeStart: 18, nodeEnd: 27, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'side_impact' },
    { id: 59, name: 'Cockpit SIS Counter-Diag R', nodeStart: 19, nodeEnd: 24, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 60, name: 'Cockpit SIS Counter-Diag L', nodeStart: 20, nodeEnd: 25, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 10. Main Hoop (MH) (Nodes 24 through 32)
    { id: 61, name: 'MH Lower Leg R', nodeStart: 24, nodeEnd: 26, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 62, name: 'MH Lower Leg L', nodeStart: 25, nodeEnd: 27, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 63, name: 'MH Mid Leg R', nodeStart: 26, nodeEnd: 28, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 64, name: 'MH Mid Leg L', nodeStart: 27, nodeEnd: 29, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 65, name: 'MH Upper Leg R', nodeStart: 28, nodeEnd: 30, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 66, name: 'MH Upper Leg L', nodeStart: 29, nodeEnd: 31, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 67, name: 'MH Crown R', nodeStart: 30, nodeEnd: 32, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 68, name: 'MH Crown L', nodeStart: 31, nodeEnd: 32, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 69, name: 'MH Harness Bar Crossmember', nodeStart: 28, nodeEnd: 29, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 70, name: 'MH Base Crossmember', nodeStart: 24, nodeEnd: 25, sectionId: 'sec_main_hoop', materialId: 'mat_chromoly_4130', category: 'main_hoop' },
    { id: 71, name: 'MH Diagonal Triangulation', nodeStart: 25, nodeEnd: 28, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 11. Main Hoop Rear Bracing (Rules require MH rear braces from top of hoop rearward)
    { id: 72, name: 'MH Rear Brace R', nodeStart: 30, nodeEnd: 35, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 73, name: 'MH Rear Brace L', nodeStart: 31, nodeEnd: 36, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 74, name: 'MH Apex Rear Center Brace', nodeStart: 32, nodeEnd: 37, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 12. Rear Engine Bay Structure (Station 1.45 m to 1.85 m)
    { id: 75, name: 'Engine Bay Low Rail R', nodeStart: 24, nodeEnd: 33, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 76, name: 'Engine Bay Low Rail L', nodeStart: 25, nodeEnd: 34, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 77, name: 'Engine Bay Up Rail R', nodeStart: 26, nodeEnd: 35, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 78, name: 'Engine Bay Up Rail L', nodeStart: 27, nodeEnd: 36, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 79, name: 'Engine Bay Diag R', nodeStart: 24, nodeEnd: 35, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 80, name: 'Engine Bay Diag L', nodeStart: 25, nodeEnd: 36, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // Station 1.85 m Crossmembers
    { id: 81, name: 'Engine Bay Low Crossmember', nodeStart: 33, nodeEnd: 34, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 82, name: 'Engine Bay Up Crossmember', nodeStart: 35, nodeEnd: 36, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 83, name: 'Engine Bay Strut R', nodeStart: 33, nodeEnd: 35, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 84, name: 'Engine Bay Strut L', nodeStart: 34, nodeEnd: 36, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 85, name: 'Rear Tower Strut R', nodeStart: 35, nodeEnd: 37, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 86, name: 'Rear Tower Strut L', nodeStart: 36, nodeEnd: 37, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 13. Rear Suspension Bay & Diff Mounts (Station 1.85 m to 2.25 m)
    { id: 87, name: 'Diff Low Rail R', nodeStart: 33, nodeEnd: 38, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 88, name: 'Diff Low Rail L', nodeStart: 34, nodeEnd: 39, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 89, name: 'Diff Up Rail R', nodeStart: 35, nodeEnd: 40, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 90, name: 'Diff Up Rail L', nodeStart: 36, nodeEnd: 41, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'frame_rail' },
    { id: 91, name: 'Diff Low Aft Crossmember', nodeStart: 38, nodeEnd: 39, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 92, name: 'Diff Up Aft Crossmember', nodeStart: 40, nodeEnd: 41, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 93, name: 'Diff Post R', nodeStart: 38, nodeEnd: 40, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 94, name: 'Diff Post L', nodeStart: 39, nodeEnd: 41, sectionId: 'sec_roll_hoop_bracing', materialId: 'mat_chromoly_4130', category: 'rear_structure' },
    { id: 95, name: 'Diff Bay Diag R', nodeStart: 33, nodeEnd: 40, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 96, name: 'Diff Bay Diag L', nodeStart: 34, nodeEnd: 41, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 97, name: 'Rear Bulkhead Cross Diag', nodeStart: 38, nodeEnd: 41, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },

    // 14. Floor Diagonals for Shear Rigidity
    { id: 98, name: 'Front Floor Diag', nodeStart: 1, nodeEnd: 6, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 99, name: 'Cockpit Floor Diag', nodeStart: 17, nodeEnd: 25, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
    { id: 100, name: 'Rear Floor Diag', nodeStart: 33, nodeEnd: 39, sectionId: 'sec_secondary_bracing', materialId: 'mat_chromoly_4130', category: 'bracing' },
  ];

  // Baseline Boundary Conditions (Rear suspension pickups clamped)
  const defaultBCs: BoundaryCondition[] = [
    { nodeId: 38, name: 'Rear Susp Low R Fix', ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
    { nodeId: 39, name: 'Rear Susp Low L Fix', ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
    { nodeId: 40, name: 'Rear Susp Up R Fix', ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
    { nodeId: 41, name: 'Rear Susp Up L Fix', ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
  ];

  // Standard Formula SAE Load Cases
  const vehicleMass = 300; // 300 kg vehicle + driver mass
  const g = 9.80665;

  // 1. Vertical Bump / Landing (3.0 g downward bump load distributed to suspension pickups)
  // F_total = 300 kg * 9.81 * 3.0 = 8,826 N.
  // 45% front (3,972 N, 4 front nodes -> ~993 N each), 55% rear (4,854 N)
  const bumpLoads: NodalLoad[] = [
    { nodeId: 5, fx: 0, fy: 0, fz: -993, description: '3g Bump - FL Low Fwd' },
    { nodeId: 6, fx: 0, fy: 0, fz: -993, description: '3g Bump - FL Low Fwd L' },
    { nodeId: 9, fx: 0, fy: 0, fz: -993, description: '3g Bump - FL Low Aft R' },
    { nodeId: 10, fx: 0, fy: 0, fz: -993, description: '3g Bump - FL Low Aft L' },
    // Engine & Driver inertias at cockpit / hoop
    { nodeId: 24, fx: 0, fy: 0, fz: -1200, description: '3g Bump - Driver Mass (MH Base R)' },
    { nodeId: 25, fx: 0, fy: 0, fz: -1200, description: '3g Bump - Driver Mass (MH Base L)' },
    { nodeId: 33, fx: 0, fy: 0, fz: -1500, description: '3g Bump - Powertrain Mass R' },
    { nodeId: 34, fx: 0, fy: 0, fz: -1500, description: '3g Bump - Powertrain Mass L' },
  ];

  // 2. Lateral Cornering (1.5 g lateral inertial load)
  // F_y = 300 kg * 9.81 * 1.5 = 4,413 N in +Y direction
  const corneringLoads: NodalLoad[] = [
    { nodeId: 5, fx: 0, fy: 500, fz: 0, description: '1.5g Cornering - Front Susp R' },
    { nodeId: 6, fx: 0, fy: 500, fz: 0, description: '1.5g Cornering - Front Susp L' },
    { nodeId: 9, fx: 0, fy: 500, fz: 0, description: '1.5g Cornering - Front Susp Aft R' },
    { nodeId: 10, fx: 0, fy: 500, fz: 0, description: '1.5g Cornering - Front Susp Aft L' },
    { nodeId: 23, fx: 0, fy: 400, fz: 0, description: '1.5g Cornering - Front Hoop' },
    { nodeId: 32, fx: 0, fy: 800, fz: 0, description: '1.5g Cornering - Main Hoop Apex' },
    { nodeId: 24, fx: 0, fy: 600, fz: 0, description: '1.5g Cornering - Cockpit R' },
    { nodeId: 25, fx: 0, fy: 600, fz: 0, description: '1.5g Cornering - Cockpit L' },
  ];

  // 3. Longitudinal Braking (1.5 g deceleration load)
  // F_x = 300 kg * 9.81 * 1.5 = 4,413 N in -X direction
  const brakingLoads: NodalLoad[] = [
    { nodeId: 5, fx: -1100, fy: 0, fz: 0, description: '1.5g Braking - FL Low R' },
    { nodeId: 6, fx: -1100, fy: 0, fz: 0, description: '1.5g Braking - FL Low L' },
    { nodeId: 7, fx: -1100, fy: 0, fz: 0, description: '1.5g Braking - FL Up R' },
    { nodeId: 8, fx: -1100, fy: 0, fz: 0, description: '1.5g Braking - FL Up L' },
  ];

  // 4. Combined Loading (2.0g Bump + 1.0g Cornering + 1.0g Braking)
  const combinedLoads: NodalLoad[] = [
    { nodeId: 5, fx: -735, fy: 350, fz: -650, description: 'Combined - Front Susp Low R' },
    { nodeId: 6, fx: -735, fy: 350, fz: -650, description: 'Combined - Front Susp Low L' },
    { nodeId: 9, fx: -735, fy: 350, fz: -650, description: 'Combined - Front Susp Aft R' },
    { nodeId: 10, fx: -735, fy: 350, fz: -650, description: 'Combined - Front Susp Aft L' },
    { nodeId: 24, fx: 0, fy: 400, fz: -800, description: 'Combined - Driver Inertia R' },
    { nodeId: 25, fx: 0, fy: 400, fz: -800, description: 'Combined - Driver Inertia L' },
    { nodeId: 32, fx: 0, fy: 500, fz: 0, description: 'Combined - MH Lateral' },
  ];

  // 5. Pure Torsional Stiffness Test (1000 N couple applied to front suspension track)
  const torsionLoads: NodalLoad[] = [
    { nodeId: 6, fx: 0, fy: 0, fz: 1000, description: 'Torsion Test (+1000 N on Front Left)' },
    { nodeId: 5, fx: 0, fy: 0, fz: -1000, description: 'Torsion Test (-1000 N on Front Right)' },
  ];

  const loadCases: LoadCase[] = [
    {
      id: 'lc_bump_3g',
      name: 'Load Case 1 — 3.0g Vertical Bump / Landing',
      type: 'vertical_bump',
      description: 'Simulates severe curb strike or suspension bump compression with 3g vertical factor.',
      vehicleMassKg: vehicleMass,
      gFactor: 3.0,
      frontDistribution: 0.45,
      loads: bumpLoads,
      boundaryConditions: defaultBCs,
    },
    {
      id: 'lc_cornering_1_5g',
      name: 'Load Case 2 — 1.5g Lateral Cornering',
      type: 'lateral_cornering',
      description: 'Simulates maximum steady-state lateral cornering with chassis inertia transfer.',
      vehicleMassKg: vehicleMass,
      gFactor: 1.5,
      frontDistribution: 0.45,
      loads: corneringLoads,
      boundaryConditions: defaultBCs,
    },
    {
      id: 'lc_braking_1_5g',
      name: 'Load Case 3 — 1.5g Longitudinal Braking',
      type: 'longitudinal_braking',
      description: 'Simulates panic threshold braking with forward load transfer into front suspension pickups.',
      vehicleMassKg: vehicleMass,
      gFactor: 1.5,
      frontDistribution: 0.70,
      loads: brakingLoads,
      boundaryConditions: defaultBCs,
    },
    {
      id: 'lc_combined',
      name: 'Load Case 4 — Combined Dynamic Load (2g Bump + 1g Turn + 1g Brake)',
      type: 'combined',
      description: 'Simulates multi-axis trail braking over a cornering apex curb.',
      vehicleMassKg: vehicleMass,
      gFactor: 2.0,
      frontDistribution: 0.50,
      loads: combinedLoads,
      boundaryConditions: defaultBCs,
    },
    {
      id: 'lc_torsion',
      name: 'Load Case 5 — Torsional Rigidity Test (Pure Couple)',
      type: 'torsion_test',
      description: 'Applies equal and opposite vertical couple (+1000 N / -1000 N) across front track to evaluate torsional stiffness Kt.',
      vehicleMassKg: vehicleMass,
      gFactor: 1.0,
      frontDistribution: 0.50,
      loads: torsionLoads,
      boundaryConditions: defaultBCs,
    },
  ];

  return {
    id: 'fsae_baseline_2026',
    name: 'Formula SAE Spaceframe Baseline',
    vehicleType: 'Formula SAE / Formula Student IC/EV',
    units: 'Metric_Engineering',
    created: new Date().toISOString(),
    notes: 'Generic Formula SAE collegiate tubular spaceframe complying with FSAE SES structural baseline requirements.',
    nodes,
    elements,
    materials,
    sections,
    loadCases,
    activeLoadCaseId: 'lc_bump_3g',
  };
}

export const createExampleFSAEChassis = createExampleFSAEProject;
