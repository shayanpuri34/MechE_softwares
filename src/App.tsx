/**
 * Formula SAE Chassis FEA & Optimization Platform
 *
 * Computational 3D beam-element Finite Element Analysis (FEA) and
 * structural optimization platform for Formula SAE spaceframe chassis.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChassisProject,
  CrossSection,
  FEAResult,
  LoadCase,
  Material,
  Node3D,
  BeamElement,
} from './types/engineering';
import { createExampleFSAEChassis } from './data/exampleChassis';
import { solveFEA } from './engineering/solver';
import { runTorsionalRigidityAnalysis } from './engineering/torsion';

// UI Components
import { ModelViewer } from './components/ModelViewer';
import { DashboardOverview } from './components/DashboardOverview';
import { GeometryEditor } from './components/GeometryEditor';
import { MaterialsSectionsPanel } from './components/MaterialsSectionsPanel';
import { LoadsBCPanel } from './components/LoadsBCPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { TorsionalAnalysisPanel } from './components/TorsionalAnalysisPanel';
import { OptimizationParametricPanel } from './components/OptimizationParametricPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { DesignComparisonPanel } from './components/DesignComparisonPanel';
import { EngineeringReportModal } from './components/EngineeringReportModal';
import { AssumptionsModal } from './components/AssumptionsModal';

// Icons
import {
  Activity,
  Box,
  Sliders,
  Layers,
  Anchor,
  RotateCw,
  TrendingDown,
  CheckCircle2,
  GitCompare,
  FileText,
  ShieldAlert,
  Play,
  HelpCircle,
  Menu,
  X,
  Compass,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'viewport'
  | 'geometry'
  | 'materials'
  | 'loads'
  | 'results'
  | 'torsion'
  | 'optimization'
  | 'validation'
  | 'comparison';

export default function App() {
  // Project State
  const [project, setProject] = useState<ChassisProject>(() => createExampleFSAEChassis());
  const [activeLoadCaseId, setActiveLoadCaseId] = useState<string>(
    project.loadCases[0]?.id || 'lc_3g_bump'
  );

  // FEA Results State
  const [feaResult, setFeaResult] = useState<FEAResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  // Selection State
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modals
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Maps for fast lookup
  const materialsMap = useMemo(
    () => new Map<string, Material>(project.materials.map((m) => [m.id, m])),
    [project.materials]
  );
  const sectionsMap = useMemo(
    () => new Map<string, CrossSection>(project.sections.map((s) => [s.id, s])),
    [project.sections]
  );

  const activeLoadCase = useMemo(() => {
    return project.loadCases.find((lc) => lc.id === activeLoadCaseId) || project.loadCases[0];
  }, [project.loadCases, activeLoadCaseId]);

  // Solver Orchestration
  const runSolver = useCallback(() => {
    setIsSolving(true);
    setTimeout(() => {
      try {
        const matMap = new Map<string, Material>(project.materials.map((m) => [m.id, m]));
        const secMap = new Map<string, CrossSection>(project.sections.map((s) => [s.id, s]));

        // 1. Solve full 3D Frame FEA for current load case
        const res = solveFEA(
          project.nodes,
          project.elements,
          matMap,
          secMap,
          activeLoadCase.boundaryConditions,
          activeLoadCase.loads
        );

        // 2. Run Torsional Rigidity Analysis
        try {
          const torsionRes = runTorsionalRigidityAnalysis(
            project.nodes,
            project.elements,
            matMap,
            secMap,
            1000
          );
          res.torsionalStiffness = {
            torqueNm: torsionRes.torqueAppliedNm,
            angleRad: torsionRes.twistAngleRad,
            angleDeg: torsionRes.twistAngleDeg,
            ktNmPerRad: torsionRes.torsionalStiffnessNmPerRad,
            ktNmPerDeg: torsionRes.torsionalStiffnessNmPerDeg,
          };
        } catch {
          // ignore if torsion test encounters singular BCs
        }

        setFeaResult(res);
      } catch (err: any) {
        alert(`FEA Solver encountered an error: ${err.message}`);
      } finally {
        setIsSolving(false);
      }
    }, 40);
  }, [project, activeLoadCase]);

  // Run initial solve on mount
  useEffect(() => {
    runSolver();
  }, [runSolver]);

  // Update Handlers
  const handleUpdateNodes = (newNodes: Node3D[]) => {
    setProject((prev) => ({ ...prev, nodes: newNodes }));
  };

  const handleUpdateElements = (newElements: BeamElement[]) => {
    setProject((prev) => ({ ...prev, elements: newElements }));
  };

  const handleUpdateMaterials = (newMaterials: Material[]) => {
    setProject((prev) => ({ ...prev, materials: newMaterials }));
  };

  const handleUpdateSections = (newSections: CrossSection[]) => {
    setProject((prev) => ({ ...prev, sections: newSections }));
  };

  const handleUpdateLoadCase = (updatedCase: LoadCase) => {
    setProject((prev) => ({
      ...prev,
      loadCases: prev.loadCases.map((lc) => (lc.id === updatedCase.id ? updatedCase : lc)),
    }));
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'viewport', label: '3D Viewport', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'geometry', label: 'Geometry', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'materials', label: 'Sections & SES', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'loads', label: 'Loads & BCs', icon: <Anchor className="w-3.5 h-3.5" /> },
    { id: 'results', label: 'Results', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'torsion', label: 'Torsion Test', icon: <RotateCw className="w-3.5 h-3.5" /> },
    { id: 'optimization', label: 'Optimization', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'validation', label: 'Verification', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'comparison', label: 'Comparison', icon: <GitCompare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Brand Logo & Vehicle Tag */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-cyan-500/20">
                FS
              </div>
              <div>
                <span className="font-bold text-sm tracking-wide text-white block leading-none">
                  FSAE CHASSIS FEA
                </span>
                <span className="text-[10px] text-slate-400 font-mono-code leading-none">
                  3D Spaceframe Analysis & Optimization
                </span>
              </div>
            </div>

            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-slate-300 border border-slate-700">
              Formula Student SES
            </span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Assumptions Button */}
            <button
              onClick={() => setIsAssumptionsOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
              title="Engineering Assumptions & Limitations"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Assumptions</span>
            </button>

            {/* Technical Report Button */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition"
              title="Generate Technical Report"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Report</span>
            </button>

            {/* Primary Run FEA Button */}
            <button
              onClick={runSolver}
              disabled={isSolving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-slate-950 ${isSolving ? 'animate-spin' : ''}`} />
              <span>{isSolving ? 'SOLVING...' : 'RUN FEA'}</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-800/40">
          <nav className="flex space-x-1 py-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <DashboardOverview
              project={project}
              feaResult={feaResult}
              activeLoadCase={activeLoadCase}
              onRunFEA={runSolver}
              onSelectTab={(tabId) => setActiveTab(tabId as ActiveTab)}
              onSelectLoadCase={setActiveLoadCaseId}
            />

            {/* Interactive 3D Model Viewport Embedded in Overview */}
            <div className="h-[520px] w-full">
              <ModelViewer
                nodes={project.nodes}
                elements={project.elements}
                feaResult={feaResult}
                loads={activeLoadCase.loads}
                boundaryConditions={activeLoadCase.boundaryConditions}
                selectedElementId={selectedElementId}
                selectedNodeId={selectedNodeId}
                onSelectElement={setSelectedElementId}
                onSelectNode={setSelectedNodeId}
                activeLoadCaseName={activeLoadCase.name}
              />
            </div>
          </div>
        )}

        {/* 2. Full 3D Viewport Tab */}
        {activeTab === 'viewport' && (
          <div className="h-[calc(100vh-140px)] min-h-[500px] w-full">
            <ModelViewer
              nodes={project.nodes}
              elements={project.elements}
              feaResult={feaResult}
              loads={activeLoadCase.loads}
              boundaryConditions={activeLoadCase.boundaryConditions}
              selectedElementId={selectedElementId}
              selectedNodeId={selectedNodeId}
              onSelectElement={setSelectedElementId}
              onSelectNode={setSelectedNodeId}
              activeLoadCaseName={activeLoadCase.name}
            />
          </div>
        )}

        {/* 3. Geometry Editor Tab */}
        {activeTab === 'geometry' && (
          <GeometryEditor
            nodes={project.nodes}
            elements={project.elements}
            sections={project.sections}
            materials={project.materials}
            selectedNodeId={selectedNodeId}
            selectedElementId={selectedElementId}
            onSelectNode={setSelectedNodeId}
            onSelectElement={setSelectedElementId}
            onUpdateNodes={handleUpdateNodes}
            onUpdateElements={handleUpdateElements}
          />
        )}

        {/* 4. Materials & Sections Tab */}
        {activeTab === 'materials' && (
          <MaterialsSectionsPanel
            materials={project.materials}
            sections={project.sections}
            onUpdateMaterials={handleUpdateMaterials}
            onUpdateSections={handleUpdateSections}
          />
        )}

        {/* 5. Loads & Boundary Conditions Tab */}
        {activeTab === 'loads' && (
          <LoadsBCPanel
            nodes={project.nodes}
            loadCases={project.loadCases}
            activeLoadCase={activeLoadCase}
            onSelectLoadCase={setActiveLoadCaseId}
            onUpdateLoadCase={handleUpdateLoadCase}
            onAddLoadCase={(newCase) =>
              setProject((prev) => ({
                ...prev,
                loadCases: [...prev.loadCases, newCase],
              }))
            }
          />
        )}

        {/* 6. Results & Telemetry Tab */}
        {activeTab === 'results' && (
          <ResultsPanel
            nodes={project.nodes}
            elements={project.elements}
            feaResult={feaResult}
            selectedElementId={selectedElementId}
            selectedNodeId={selectedNodeId}
            onSelectElement={setSelectedElementId}
            onSelectNode={setSelectedNodeId}
          />
        )}

        {/* 7. Torsional Rigidity Tab */}
        {activeTab === 'torsion' && (
          <TorsionalAnalysisPanel
            nodes={project.nodes}
            elements={project.elements}
            materials={project.materials}
            sections={project.sections}
            chassisMassKg={feaResult ? feaResult.chassisMassKg : 38.5}
          />
        )}

        {/* 8. Optimization & Member Sensitivity Tab */}
        {activeTab === 'optimization' && (
          <OptimizationParametricPanel
            nodes={project.nodes}
            elements={project.elements}
            materials={project.materials}
            sections={project.sections}
            bcs={activeLoadCase.boundaryConditions}
            loads={activeLoadCase.loads}
            onSelectElement={setSelectedElementId}
          />
        )}

        {/* 9. Verification & Analytical Benchmarks Tab */}
        {activeTab === 'validation' && <ValidationPanel />}

        {/* 10. Design Comparison Tab */}
        {activeTab === 'comparison' && (
          <DesignComparisonPanel project={project} feaResult={feaResult} />
        )}
      </main>

      {/* Engineering Technical Report Modal */}
      <EngineeringReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={project}
        feaResult={feaResult}
        activeLoadCase={activeLoadCase}
      />

      {/* Engineering Assumptions Modal */}
      <AssumptionsModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 font-mono-code">
        Formula SAE / Formula Student Structural FEA & Optimization Platform • 3D Euler-Bernoulli Frame Elements
      </footer>
    </div>
  );
}
