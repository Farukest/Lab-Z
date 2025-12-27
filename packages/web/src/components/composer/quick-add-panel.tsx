'use client';

/**
 * Quick Add Panel
 *
 * Shows suggested blocks that can be added with one click
 */

import { Zap, Plus, Info } from 'lucide-react';
import { useBlockAvailability, useProjectStore } from '@/store/project-store';
import {
  getBlockById,
  type Block,
  type ProjectBlock,
  type ZoneType
} from '@labz/core/blocks';
import { useState } from 'react';

interface QuickAddItemProps {
  block: Block;
  reason: string;
  onAdd: () => void;
}

function QuickAddItem({ block, reason, onAdd }: QuickAddItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getZoneColor = (zones: ZoneType[]) => {
    if (zones.includes('imports')) return 'bg-purple-500';
    if (zones.includes('state')) return 'bg-blue-500';
    if (zones.includes('function-body')) return 'bg-green-500';
    return 'bg-neutral-500';
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onAdd}
        className={`
          flex items-center gap-2 px-3 py-2 rounded
          bg-neutral-800 border border-neutral-700
          hover:border-neutral-500 hover:bg-neutral-750
          transition-all duration-150
          text-left w-full
        `}
      >
        <span className={`w-2 h-2 rounded-full ${getZoneColor(block.canDropIn)}`} />
        <span className="font-mono text-xs text-white truncate flex-1">
          {block.name}
        </span>
        <Plus size={14} className="text-neutral-500 group-hover:text-green-400 transition-colors" />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="absolute left-0 top-full mt-1 z-50 p-3
                     bg-neutral-900 border border-neutral-700 rounded shadow-xl
                     min-w-[250px] max-w-[300px]"
        >
          <div className="font-mono text-sm text-white font-medium">
            {block.name}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {block.description}
          </p>
          <div className="mt-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Zap size={10} />
              <span>{reason}</span>
            </div>
          </div>
          {block.canDropIn.length > 0 && (
            <div className="mt-2 flex gap-1">
              {block.canDropIn.map((zone) => (
                <span
                  key={zone}
                  className="px-1.5 py-0.5 text-[9px] font-mono bg-neutral-800 rounded text-neutral-500"
                >
                  {zone}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickAddPanel() {
  const availability = useBlockAvailability();
  const {
    project,
    selectedFunctionId,
    addImport,
    addStateVariable,
    addToFunctionBody,
    addFunction
  } = useProjectStore();

  const handleQuickAdd = (block: Block) => {
    const projectBlock: ProjectBlock = {
      id: `${block.id}-${Date.now()}`,
      blockId: block.id,
      config: {},
      order: 0,
      zoneType: block.canDropIn[0]
    };

    // Fill defaults
    if (block.params) {
      for (const param of block.params) {
        if (param.default) {
          projectBlock.config[param.id] = param.default;
        }
      }
    }

    // Add to appropriate zone
    if (block.canDropIn.includes('imports')) {
      addImport(projectBlock);
    } else if (block.canDropIn.includes('state')) {
      addStateVariable(projectBlock);
    } else if (block.canDropIn.includes('function-body')) {
      // Need a function first
      if (project.functions.length === 0) {
        // Create a function first
        const fnId = `fn-${Date.now()}`;
        addFunction({
          id: fnId,
          name: 'newFunction',
          visibility: 'external',
          params: [],
          body: []
        });
        // Then add to it
        setTimeout(() => {
          addToFunctionBody(fnId, projectBlock);
        }, 0);
      } else {
        // Add to selected or last function
        const targetFnId = selectedFunctionId || project.functions[project.functions.length - 1].id;
        addToFunctionBody(targetFnId, projectBlock);
      }
    }
  };

  const suggestedBlocks = availability.suggestedBlocks
    .map((avail) => {
      const block = getBlockById(avail.blockId);
      if (!block) return null;
      return { block, reason: avail.suggestedReason || 'Suggested' };
    })
    .filter((item): item is { block: Block; reason: string } => item !== null);

  return (
    <div className="p-3 border-b border-neutral-800 bg-neutral-900/80">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-yellow-500" />
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Quick Add
        </span>
        <span className="text-[10px] text-neutral-600">
          (click to add instantly)
        </span>
      </div>

      {suggestedBlocks.length === 0 ? (
        <div className="py-4 text-center">
          <div className="text-neutral-600 text-xs">
            ✓ All essential blocks added
          </div>
          <div className="text-neutral-700 text-[10px] mt-1">
            Drag blocks from below to continue
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {suggestedBlocks.slice(0, 4).map(({ block, reason }) => (
            <QuickAddItem
              key={block.id}
              block={block}
              reason={reason}
              onAdd={() => handleQuickAdd(block)}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-2 pt-2 border-t border-neutral-800/50 flex items-center gap-3 text-[10px] text-neutral-600">
        <span>{availability.stats.available} available</span>
        <span>{availability.stats.total - availability.stats.available} unavailable</span>
      </div>
    </div>
  );
}
