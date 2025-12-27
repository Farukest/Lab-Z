'use client';

/**
 * Visual Contract Composer
 *
 * Main component that combines block library, contract builder, and code preview
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type PointerActivationConstraint
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle
} from 'react-resizable-panels';
import { BlockLibrary } from './block-library';
import { ContractBuilder } from './contract-builder';
import { CodePreview } from './code-preview';
import { useProjectStore } from '@/store/project-store';
import {
  validateDrop,
  getBlockById,
  type Block,
  type ZoneType,
  type ProjectBlock
} from '@labz/core/blocks';

// Custom PointerSensor that ignores resize handles
class ResizeAwarePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        const target = event.target as HTMLElement;
        // Don't activate drag if clicking on resize handle
        if (target.closest('[data-separator]') || target.closest('[data-panel-resize-handle]')) {
          return false;
        }
        return true;
      },
    },
  ];
}

// Sound effect for successful drop
const playDropSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported
  }
};

function DragOverlayContent({ block }: { block: Block }) {
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      import: 'border-l-purple-500',
      state: 'border-l-blue-500',
      'input-conversion': 'border-l-yellow-500',
      arithmetic: 'border-l-green-500',
      comparison: 'border-l-orange-500',
      bitwise: 'border-l-red-500',
      conditional: 'border-l-pink-500',
      acl: 'border-l-emerald-500',
      decrypt: 'border-l-violet-500',
    };
    return colors[category] || 'border-l-neutral-500';
  };

  return (
    <div
      className={`
        p-3 bg-neutral-800 border border-neutral-600 border-l-4 rounded shadow-2xl
        cursor-grabbing pointer-events-none
        ${getCategoryColor(block.category)}
      `}
      style={{ minWidth: '200px' }}
    >
      <div className="font-mono text-sm font-medium text-white">{block.name}</div>
      <div className="text-xs text-neutral-400 mt-1">{block.description.slice(0, 50)}</div>
    </div>
  );
}

export function Composer() {
  const {
    project,
    selectedFunctionId,
    setDraggedBlock,
    setValidationResult,
    addImport,
    addStateVariable,
    addToFunctionBody,
    selectFunction,
    reorderImports,
    reorderStateVariables,
    reorderFunctionBody
  } = useProjectStore();

  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [overZoneType, setOverZoneType] = useState<ZoneType | null>(null);
  const [dropSuccess, setDropSuccess] = useState<{ zone: ZoneType; timestamp: number } | null>(null);

  // Use custom sensor that ignores resize handles
  const sensors = useSensors(
    useSensor(ResizeAwarePointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const block = active.data.current?.block as Block | undefined;

      if (block) {
        setActiveBlock(block);
        setDraggedBlock(block);
      }
    },
    [setDraggedBlock]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over || !activeBlock) {
        setValidationResult(null);
        setOverZoneType(null);
        return;
      }

      const overId = over.id.toString();
      let zoneType: ZoneType | null = null;
      let functionId: string | undefined;

      // Determine the zone type from the droppable
      if (overId === 'imports-zone') {
        zoneType = 'imports';
      } else if (overId === 'state-zone') {
        zoneType = 'state';
      } else if (overId.startsWith('function-body-')) {
        zoneType = 'function-body';
        functionId = overId.replace('function-body-', '');
        selectFunction(functionId);
      }

      if (zoneType) {
        setOverZoneType(zoneType);

        // Validate the drop
        const fn = functionId ? project.functions.find((f) => f.id === functionId) : null;
        const dropPosition = fn ? fn.body.length : 0;

        const result = validateDrop(
          activeBlock,
          zoneType,
          dropPosition,
          project,
          functionId
        );

        setValidationResult(result);
      } else {
        setValidationResult(null);
        setOverZoneType(null);
      }
    },
    [activeBlock, project, setValidationResult, selectFunction]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveBlock(null);
      setDraggedBlock(null);
      setValidationResult(null);
      setOverZoneType(null);

      if (!over) return;

      const activeId = active.id.toString();
      const overId = over.id.toString();

      // Check if this is a reorder operation (sorting within same zone)
      if (!active.data.current?.block) {
        // Find which zone this item belongs to and reorder
        const importIndex = project.imports.findIndex(b => b.id === activeId);
        if (importIndex !== -1) {
          const overIndex = project.imports.findIndex(b => b.id === overId);
          if (overIndex !== -1 && importIndex !== overIndex) {
            reorderImports(importIndex, overIndex);
          }
          return;
        }

        const stateIndex = project.stateVariables.findIndex(b => b.id === activeId);
        if (stateIndex !== -1) {
          const overIndex = project.stateVariables.findIndex(b => b.id === overId);
          if (overIndex !== -1 && stateIndex !== overIndex) {
            reorderStateVariables(stateIndex, overIndex);
          }
          return;
        }

        // Check function bodies
        for (const fn of project.functions) {
          const fnBodyIndex = fn.body.findIndex(b => b.id === activeId);
          if (fnBodyIndex !== -1) {
            const overIndex = fn.body.findIndex(b => b.id === overId);
            if (overIndex !== -1 && fnBodyIndex !== overIndex) {
              reorderFunctionBody(fn.id, fnBodyIndex, overIndex);
            }
            return;
          }
        }

        return;
      }

      const block = active.data.current.block as Block;

      // Determine where to add the block
      let zoneType: ZoneType | null = null;
      let functionId: string | undefined;

      if (overId === 'imports-zone') {
        zoneType = 'imports';
      } else if (overId === 'state-zone') {
        zoneType = 'state';
      } else if (overId.startsWith('function-body-')) {
        zoneType = 'function-body';
        functionId = overId.replace('function-body-', '');
      }

      if (!zoneType) return;

      // Validate before adding
      const fn = functionId ? project.functions.find((f) => f.id === functionId) : null;
      const dropPosition = fn ? fn.body.length : 0;

      const result = validateDrop(block, zoneType, dropPosition, project, functionId);

      if (!result.valid) {
        // Could show a toast here
        console.warn('Invalid drop:', result.errors);
        return;
      }

      // Create the project block
      const projectBlock: ProjectBlock = {
        id: `${block.id}-${Date.now()}`,
        blockId: block.id,
        config: {},
        order: dropPosition,
        zoneType
      };

      // Fill in default config values
      if (block.params) {
        for (const param of block.params) {
          if (param.default) {
            projectBlock.config[param.id] = param.default;
          }
        }
      }

      // Add to appropriate zone
      switch (zoneType) {
        case 'imports':
          addImport(projectBlock);
          break;
        case 'state':
          addStateVariable(projectBlock);
          break;
        case 'function-body':
          if (functionId) {
            addToFunctionBody(functionId, projectBlock);
          }
          break;
      }

      // Play success sound and show animation
      playDropSound();
      setDropSuccess({ zone: zoneType, timestamp: Date.now() });
      setTimeout(() => setDropSuccess(null), 600);

      // Auto-add dependencies if needed
      if (result.autoAdd) {
        for (const depId of result.autoAdd) {
          const depBlock = getBlockById(depId);
          if (depBlock) {
            const depProjectBlock: ProjectBlock = {
              id: `${depId}-${Date.now()}`,
              blockId: depId,
              config: {},
              order: 0,
              zoneType: depBlock.canDropIn[0]
            };

            if (depBlock.canDropIn.includes('imports')) {
              addImport(depProjectBlock);
            } else if (depBlock.canDropIn.includes('state')) {
              addStateVariable(depProjectBlock);
            }
          }
        }
      }
    },
    [project, addImport, addStateVariable, addToFunctionBody, setDraggedBlock, setValidationResult, reorderImports, reorderStateVariables, reorderFunctionBody]
  );

  // Measuring configuration for better drop zone detection
  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always, // Recalculate on every drag
    },
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <PanelGroup orientation="horizontal" className="h-screen w-screen">
        {/* Left: Block Library */}
        <Panel id="block-library" defaultSize="20" minSize="15" maxSize="30">
          <div className="h-full overflow-hidden">
            <BlockLibrary />
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-neutral-700 hover:bg-blue-500 active:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Center: Contract Builder */}
        <Panel id="contract-builder" minSize="25">
          <div className="h-full overflow-hidden">
            <ContractBuilder
              activeBlock={activeBlock}
              overZoneType={overZoneType}
              dropSuccess={dropSuccess}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-neutral-700 hover:bg-blue-500 active:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Right: Code Preview */}
        <Panel id="code-preview" defaultSize="35" minSize="20" maxSize="50">
          <div className="h-full overflow-hidden">
            <CodePreview />
          </div>
        </Panel>
      </PanelGroup>

      <DragOverlay>
        {activeBlock && <DragOverlayContent block={activeBlock} />}
      </DragOverlay>
    </DndContext>
  );
}

export { BlockLibrary } from './block-library';
export { ContractBuilder } from './contract-builder';
export { CodePreview } from './code-preview';
