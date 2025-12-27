/**
 * Project State Store
 *
 * Zustand store for managing visual contract builder state
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  type ProjectState,
  type ProjectBlock,
  type ProjectFunction,
  type Block,
  type ValidationResult,
  type AvailabilityAnalysis,
  analyzeBlockAvailability
} from '@labz/core/blocks';
import { parseContract, type ParsedContract } from '@/lib/contract-parser';

// Loaded template type
interface LoadedTemplate {
  id: string;
  name: string;
  contractCode: string;
  testCode: string;
}

interface ProjectStore {
  // Project state
  project: ProjectState;

  // UI state
  selectedFunctionId: string | null;
  draggedBlock: Block | null;
  validationResult: ValidationResult | null;
  highlightedBlockId: string | null;
  loadedTemplate: LoadedTemplate | null;
  parsedContract: ParsedContract | null;

  // Actions
  setProject: (project: ProjectState) => void;
  setProjectName: (name: string) => void;

  // Import actions
  addImport: (block: ProjectBlock) => void;
  removeImport: (id: string) => void;
  updateImport: (id: string, config: Record<string, string>) => void;
  reorderImports: (fromIndex: number, toIndex: number) => void;

  // State variable actions
  addStateVariable: (block: ProjectBlock) => void;
  removeStateVariable: (id: string) => void;
  updateStateVariable: (id: string, config: Record<string, string>) => void;
  reorderStateVariables: (fromIndex: number, toIndex: number) => void;

  // Function actions
  addFunction: (fn: ProjectFunction) => void;
  removeFunction: (id: string) => void;
  updateFunction: (id: string, updates: Partial<ProjectFunction>) => void;
  selectFunction: (id: string | null) => void;

  // Function body actions
  addToFunctionBody: (functionId: string, block: ProjectBlock, position?: number) => void;
  removeFromFunctionBody: (functionId: string, blockId: string) => void;
  updateFunctionBodyBlock: (functionId: string, blockId: string, config: Record<string, string>) => void;
  reorderFunctionBody: (functionId: string, fromIndex: number, toIndex: number) => void;

  // Constructor actions
  addToConstructorBody: (block: ProjectBlock) => void;
  removeFromConstructorBody: (id: string) => void;

  // Drag state
  setDraggedBlock: (block: Block | null) => void;
  setValidationResult: (result: ValidationResult | null) => void;

  // Highlight state (for locate in code feature)
  setHighlightedBlockId: (blockId: string | null) => void;

  // Loaded template (for code preview)
  setLoadedTemplate: (template: LoadedTemplate | null) => void;

  // Load from contract code
  loadFromContract: (contractCode: string, templateInfo?: { id: string; name: string; testCode: string }) => void;

  // Reset
  resetProject: () => void;
}

const createEmptyProject = (): ProjectState => ({
  name: 'MyContract',
  version: '1.0.0',
  inherits: ['SepoliaConfig'],
  imports: [
    {
      id: 'import-1',
      blockId: 'import-fhe',
      config: { types: 'euint32, externalEuint32' },
      order: 0,
      zoneType: 'imports'
    },
    {
      id: 'import-2',
      blockId: 'import-config',
      config: {},
      order: 1,
      zoneType: 'imports'
    }
  ],
  stateVariables: [],
  functions: [],
  modifiers: []
});

let blockIdCounter = 0;
const generateId = () => `block-${++blockIdCounter}-${Date.now()}`;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: createEmptyProject(),
  selectedFunctionId: null,
  draggedBlock: null,
  validationResult: null,
  highlightedBlockId: null,
  loadedTemplate: null,
  parsedContract: null,

  setProject: (project) => set({ project }),

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name }
    })),

  addImport: (block) =>
    set((state) => ({
      project: {
        ...state.project,
        imports: [...state.project.imports, { ...block, id: block.id || generateId() }]
      }
    })),

  removeImport: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        imports: state.project.imports.filter((b) => b.id !== id)
      }
    })),

  updateImport: (id, config) =>
    set((state) => ({
      project: {
        ...state.project,
        imports: state.project.imports.map((b) =>
          b.id === id ? { ...b, config: { ...b.config, ...config } } : b
        )
      }
    })),

  reorderImports: (fromIndex, toIndex) =>
    set((state) => {
      const imports = [...state.project.imports];
      const [removed] = imports.splice(fromIndex, 1);
      imports.splice(toIndex, 0, removed);
      return {
        project: {
          ...state.project,
          imports: imports.map((b, i) => ({ ...b, order: i }))
        }
      };
    }),

  addStateVariable: (block) =>
    set((state) => ({
      project: {
        ...state.project,
        stateVariables: [
          ...state.project.stateVariables,
          { ...block, id: block.id || generateId() }
        ]
      }
    })),

  removeStateVariable: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        stateVariables: state.project.stateVariables.filter((b) => b.id !== id)
      }
    })),

  updateStateVariable: (id, config) =>
    set((state) => ({
      project: {
        ...state.project,
        stateVariables: state.project.stateVariables.map((b) =>
          b.id === id ? { ...b, config: { ...b.config, ...config } } : b
        )
      }
    })),

  reorderStateVariables: (fromIndex, toIndex) =>
    set((state) => {
      const stateVariables = [...state.project.stateVariables];
      const [removed] = stateVariables.splice(fromIndex, 1);
      stateVariables.splice(toIndex, 0, removed);
      return {
        project: {
          ...state.project,
          stateVariables: stateVariables.map((b, i) => ({ ...b, order: i }))
        }
      };
    }),

  addFunction: (fn) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: [...state.project.functions, fn]
      },
      selectedFunctionId: fn.id
    })),

  removeFunction: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: state.project.functions.filter((f) => f.id !== id)
      },
      selectedFunctionId:
        state.selectedFunctionId === id ? null : state.selectedFunctionId
    })),

  updateFunction: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: state.project.functions.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        )
      }
    })),

  selectFunction: (id) => set({ selectedFunctionId: id }),

  addToFunctionBody: (functionId, block, position) =>
    set((state) => {
      const functions = state.project.functions.map((f) => {
        if (f.id !== functionId) return f;

        const newBlock = { ...block, id: block.id || generateId() };
        const body = [...f.body];

        if (position !== undefined && position >= 0 && position <= body.length) {
          body.splice(position, 0, newBlock);
        } else {
          body.push(newBlock);
        }

        // Update order values
        return {
          ...f,
          body: body.map((b, i) => ({ ...b, order: i }))
        };
      });

      return { project: { ...state.project, functions } };
    }),

  removeFromFunctionBody: (functionId, blockId) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: state.project.functions.map((f) =>
          f.id === functionId
            ? { ...f, body: f.body.filter((b) => b.id !== blockId) }
            : f
        )
      }
    })),

  updateFunctionBodyBlock: (functionId, blockId, config) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: state.project.functions.map((f) =>
          f.id === functionId
            ? {
                ...f,
                body: f.body.map((b) =>
                  b.id === blockId ? { ...b, config: { ...b.config, ...config } } : b
                )
              }
            : f
        )
      }
    })),

  reorderFunctionBody: (functionId, fromIndex, toIndex) =>
    set((state) => ({
      project: {
        ...state.project,
        functions: state.project.functions.map((f) => {
          if (f.id !== functionId) return f;

          const body = [...f.body];
          const [removed] = body.splice(fromIndex, 1);
          body.splice(toIndex, 0, removed);

          return {
            ...f,
            body: body.map((b, i) => ({ ...b, order: i }))
          };
        })
      }
    })),

  addToConstructorBody: (block) =>
    set((state) => ({
      project: {
        ...state.project,
        constructorBody: [
          ...(state.project.constructorBody || []),
          { ...block, id: block.id || generateId() }
        ]
      }
    })),

  removeFromConstructorBody: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        constructorBody: (state.project.constructorBody || []).filter((b) => b.id !== id)
      }
    })),

  setDraggedBlock: (block) => set({ draggedBlock: block }),

  setValidationResult: (result) => set({ validationResult: result }),

  setHighlightedBlockId: (blockId) => set({ highlightedBlockId: blockId }),

  setLoadedTemplate: (template) => set({ loadedTemplate: template }),

  loadFromContract: (contractCode, templateInfo) => {
    const parsed = parseContract(contractCode);
    if (!parsed) return;

    // Convert parsed contract to ProjectState
    const imports: ProjectBlock[] = parsed.imports.map((imp, idx) => ({
      id: imp.id,
      blockId: imp.path.includes('FHE.sol') ? 'import-fhe' :
               imp.path.includes('Config.sol') ? 'import-config' : 'custom-import',
      config: {
        statement: imp.statement,
        path: imp.path,
        items: imp.items?.join(', ') || '',
        line: String(imp.line)
      },
      order: idx,
      zoneType: 'imports' as const
    }));

    const stateVariables: ProjectBlock[] = parsed.stateVariables.map((sv, idx) => ({
      id: sv.id,
      blockId: sv.isMapping ? 'state-mapping' :
               sv.type.includes('euint8') ? 'state-euint8' :
               sv.type.includes('euint16') ? 'state-euint16' :
               sv.type.includes('euint32') ? 'state-euint32' :
               sv.type.includes('euint64') ? 'state-euint64' :
               sv.type.includes('euint128') ? 'state-euint128' :
               sv.type.includes('euint256') ? 'state-euint256' :
               sv.type.includes('ebool') ? 'state-ebool' :
               sv.type.includes('eaddress') ? 'state-eaddress' :
               'state-custom',
      config: {
        name: sv.name,
        type: sv.type,
        visibility: sv.visibility,
        line: String(sv.line)
      },
      order: idx,
      zoneType: 'state' as const
    }));

    const functions: ProjectFunction[] = parsed.functions.map((fn, idx) => ({
      id: fn.id,
      name: fn.name,
      visibility: fn.visibility,
      stateMutability: fn.stateMutability,
      params: fn.parameters.map((p, pIdx) => ({
        id: `param-${fn.id}-${pIdx}`,
        name: p.name,
        type: p.type
      })),
      returnType: fn.returnType,
      body: fn.fheOperations.map((fheOp, opIdx) => ({
        id: fheOp.id,
        blockId: `op-${fheOp.name.replace('FHE.', '').toLowerCase()}`,
        config: {
          name: fheOp.name,
          fullCall: fheOp.fullCall,
          line: String(fheOp.line),
          column: String(fheOp.column)
        },
        order: opIdx,
        zoneType: 'function-body' as const
      })),
      startLine: fn.startLine,
      endLine: fn.endLine,
      order: idx
    }));

    const newProject: ProjectState = {
      name: parsed.name,
      version: '1.0.0',
      inherits: parsed.inherits,
      imports,
      stateVariables,
      functions,
      modifiers: []
    };

    set({
      project: newProject,
      parsedContract: parsed,
      selectedFunctionId: functions.length > 0 ? functions[0].id : null,
      loadedTemplate: templateInfo ? {
        id: templateInfo.id,
        name: templateInfo.name,
        contractCode,
        testCode: templateInfo.testCode
      } : null
    });
  },

  resetProject: () =>
    set({
      project: createEmptyProject(),
      selectedFunctionId: null,
      draggedBlock: null,
      validationResult: null,
      highlightedBlockId: null,
      loadedTemplate: null,
      parsedContract: null
    })
}));

/**
 * Hook to get block availability analysis
 * Recomputes when project state changes
 */
export function useBlockAvailability(): AvailabilityAnalysis {
  const project = useProjectStore((state) => state.project);
  const selectedFunctionId = useProjectStore((state) => state.selectedFunctionId);

  return useMemo(() => {
    return analyzeBlockAvailability(project, selectedFunctionId);
  }, [project, selectedFunctionId]);
}

/**
 * Hook to check if a specific block is available
 */
export function useIsBlockAvailable(blockId: string): { available: boolean; reason?: string } {
  const availability = useBlockAvailability();
  const blockAvail = availability.blocks.get(blockId);

  return {
    available: blockAvail?.available ?? false,
    reason: blockAvail?.reason
  };
}
