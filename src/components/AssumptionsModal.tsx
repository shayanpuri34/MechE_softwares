/**
 * Engineering Assumptions & Solver Limitations Modal
 */
import React from 'react';
import { X, ShieldAlert, BookOpen, AlertTriangle } from 'lucide-react';

interface AssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssumptionsModal: React.FC<AssumptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Engineering Assumptions & Numerical Limitations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>1. Euler-Bernoulli Beam Kinematics</span>
            </h3>
            <p className="text-slate-400">
              The solver uses 12-degree-of-freedom 3D Euler-Bernoulli frame elements. It assumes that
              plane sections perpendicular to the longitudinal axis remain plane and perpendicular after
              bending. For slender tubular spaceframe members where slenderness ratio $L/D &gt; 10$, shear
              deformation is negligible (&lt; 2% effect on displacement).
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>2. Linear Elasticity (Hooke's Law)</span>
            </h3>
            <p className="text-slate-400">
              The material is assumed homogeneous, isotropic, and linear-elastic ($\sigma = E\epsilon$).
              The solver does not model post-yield plasticity, strain hardening, or fracture. If stresses
              exceed yield strength ($\sigma &gt; \sigma_y$), the structure has technically begun permanent
              plastic deformation.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              3. Rigid Node Connection Assumption
            </h3>
            <p className="text-slate-400">
              All intersecting tubular members are assumed to be rigidly coupled in all 6 degrees of freedom
              at their shared geometric nodes. In real welded tubular spaceframes, weld heat-affected zones
              (HAZ) and local tube wall ovalization can introduce 5% to 15% joint flexibility.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              4. Small Deformation Theory
            </h3>
            <p className="text-slate-400">
              Displacements and rotations are assumed small compared to element dimensions ($\sin\theta \approx \theta$).
              Second-order geometric stiffness effects ($P-\Delta$ buckling effects) are not included in this linear static solver.
            </p>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-lg text-amber-200">
            <strong className="block text-amber-300 font-semibold mb-0.5">
              Physical Testing Requirement Notice:
            </strong>
            Numerical FEA provides essential directional guidance during design synthesis. For Formula SAE competition
            scrutineering and rules compliance, structural equivalency calculations (SES) and physical torsional
            rig testing are mandatory.
          </div>
        </div>
      </div>
    </div>
  );
};
