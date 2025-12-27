'use client';

/**
 * Block Library Component
 *
 * Left side panel with searchable, draggable FHE blocks
 * Includes availability checking and grey-out system
 */

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  Plus,
  Minus,
  Calculator,
  GitCompare,
  Binary,
  Shuffle,
  Shield,
  Unlock,
  Code,
  FileInput,
  AlertCircle
} from 'lucide-react';
import { blocks, searchBlocks, type Block, type BlockCategory, type BlockAvailability } from '@labz/core/blocks';
import { useBlockAvailability } from '@/store/project-store';
import { QuickAddPanel } from './quick-add-panel';

interface BlockItemProps {
  block: Block;
  availability: BlockAvailability | undefined;
}

function DraggableBlock({ block, availability }: BlockItemProps) {
  const isAvailable = availability?.available ?? true;
  const reason = availability?.reason;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { block },
    disabled: !isAvailable // Disable dragging if not available
  });

  // Hide original element during drag - DragOverlay will show the preview
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : 'visible',
  };

  const getCategoryColor = (category: BlockCategory): string => {
    if (!isAvailable) {
      return 'border-neutral-700 bg-neutral-800/30';
    }

    const colors: Record<BlockCategory, string> = {
      import: 'border-purple-500/50 bg-purple-500/5',
      state: 'border-blue-500/50 bg-blue-500/5',
      function: 'border-cyan-500/50 bg-cyan-500/5',
      'input-conversion': 'border-yellow-500/50 bg-yellow-500/5',
      arithmetic: 'border-green-500/50 bg-green-500/5',
      comparison: 'border-orange-500/50 bg-orange-500/5',
      bitwise: 'border-red-500/50 bg-red-500/5',
      conditional: 'border-pink-500/50 bg-pink-500/5',
      acl: 'border-emerald-500/50 bg-emerald-500/5',
      decrypt: 'border-violet-500/50 bg-violet-500/5',
      modifier: 'border-amber-500/50 bg-amber-500/5',
      require: 'border-rose-500/50 bg-rose-500/5'
    };
    return colors[category] || 'border-neutral-500 bg-neutral-500/10';
  };

  const getCategoryIcon = (category: BlockCategory) => {
    const icons: Record<BlockCategory, typeof Plus> = {
      import: FileInput,
      state: Code,
      function: Code,
      'input-conversion': FileInput,
      arithmetic: Calculator,
      comparison: GitCompare,
      bitwise: Binary,
      conditional: Shuffle,
      acl: Shield,
      decrypt: Unlock,
      modifier: Code,
      require: Code
    };
    const Icon = icons[category] || Code;
    return <Icon size={14} />;
  };

  // Zone badge colors and labels
  const getZoneBadges = (zones: string[]) => {
    const zoneStyles: Record<string, { bg: string; text: string; label: string }> = {
      'imports': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'IMP' },
      'state': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'STATE' },
      'function-body': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'FUNC' },
      'constructor': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'CTOR' },
    };
    return zones.map(z => zoneStyles[z]).filter(Boolean);
  };

  const zoneBadges = getZoneBadges(block.canDropIn);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isAvailable ? listeners : {})}
      {...(isAvailable ? attributes : {})}
      className={`
        p-3 border-l-4 rounded-r relative
        transition-all duration-100
        ${getCategoryColor(block.category)}
        ${isAvailable
          ? 'cursor-grab active:cursor-grabbing hover:translate-x-1'
          : 'cursor-not-allowed opacity-50'
        }
      `}
      title={!isAvailable ? reason : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={isAvailable ? 'text-neutral-400' : 'text-neutral-600'}>
            {getCategoryIcon(block.category)}
          </span>
          <span className={`font-mono text-sm font-medium truncate ${isAvailable ? 'text-white' : 'text-neutral-500'}`}>
            {block.name}
          </span>
        </div>
        {/* Zone indicators or unavailable icon */}
        <div className="flex gap-1 flex-shrink-0">
          {isAvailable ? (
            zoneBadges.map((badge, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${badge.bg} ${badge.text}`}
                title={`Can drop in: ${block.canDropIn.join(', ')}`}
              >
                {badge.label}
              </span>
            ))
          ) : (
            <AlertCircle size={14} className="text-neutral-600" />
          )}
        </div>
      </div>

      <p className={`text-xs mt-1 line-clamp-1 ${isAvailable ? 'text-neutral-500' : 'text-neutral-600'}`}>
        {block.description}
      </p>

      {/* Show reason why unavailable */}
      {!isAvailable && reason && (
        <p className="text-[10px] text-red-400/70 mt-1 line-clamp-1">
          {reason}
        </p>
      )}

      {isAvailable && block.outputType && (
        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono bg-neutral-800 rounded text-neutral-400">
          → {block.outputType}
        </span>
      )}
    </div>
  );
}

const categoryOrder: BlockCategory[] = [
  'import',
  'state',
  'input-conversion',
  'arithmetic',
  'comparison',
  'bitwise',
  'conditional',
  'acl',
  'decrypt',
  'modifier',
  'require'
];

const categoryLabels: Record<BlockCategory, string> = {
  import: 'Imports',
  state: 'State Variables',
  function: 'Functions',
  'input-conversion': 'Input Conversion',
  arithmetic: 'Arithmetic',
  comparison: 'Comparison',
  bitwise: 'Bitwise',
  conditional: 'Conditional',
  acl: 'Access Control',
  decrypt: 'Decrypt',
  modifier: 'Modifiers',
  require: 'Requirements'
};

const categoryColors: Record<BlockCategory, string> = {
  import: 'text-purple-400',
  state: 'text-blue-400',
  function: 'text-cyan-400',
  'input-conversion': 'text-yellow-400',
  arithmetic: 'text-green-400',
  comparison: 'text-orange-400',
  bitwise: 'text-red-400',
  conditional: 'text-pink-400',
  acl: 'text-emerald-400',
  decrypt: 'text-violet-400',
  modifier: 'text-amber-400',
  require: 'text-rose-400'
};

const categoryBorderColors: Record<BlockCategory, string> = {
  import: 'border-l-purple-500',
  state: 'border-l-blue-500',
  function: 'border-l-cyan-500',
  'input-conversion': 'border-l-yellow-500',
  arithmetic: 'border-l-green-500',
  comparison: 'border-l-orange-500',
  bitwise: 'border-l-red-500',
  conditional: 'border-l-pink-500',
  acl: 'border-l-emerald-500',
  decrypt: 'border-l-violet-500',
  modifier: 'border-l-amber-500',
  require: 'border-l-rose-500'
};

export function BlockLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<BlockCategory>>(
    new Set(['import', 'state', 'input-conversion', 'arithmetic', 'acl'])
  );

  const availability = useBlockAvailability();

  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks;
    return searchBlocks(searchQuery);
  }, [searchQuery]);

  const blocksByCategory = useMemo(() => {
    const grouped = new Map<BlockCategory, Block[]>();

    for (const block of filteredBlocks) {
      const list = grouped.get(block.category) || [];
      list.push(block);
      grouped.set(block.category, list);
    }

    return grouped;
  }, [filteredBlocks]);

  // Count available blocks per category
  const availableCountByCategory = useMemo(() => {
    const counts = new Map<BlockCategory, { available: number; total: number }>();

    for (const [category, categoryBlocks] of blocksByCategory) {
      let available = 0;
      for (const block of categoryBlocks) {
        const avail = availability.blocks.get(block.id);
        if (avail?.available) available++;
      }
      counts.set(category, { available, total: categoryBlocks.length });
    }

    return counts;
  }, [blocksByCategory, availability]);

  const toggleCategory = (category: BlockCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 border-r border-neutral-800">
      {/* Quick Add Panel */}
      <QuickAddPanel />

      {/* Search */}
      <div className="p-4 border-b border-neutral-800">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded
                     text-sm text-white placeholder-neutral-500
                     focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600"
          />
        </div>

        {/* Zone Legend */}
        <div className="mt-3 p-2 bg-neutral-800/50 rounded border border-neutral-700/50">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">Drop zones:</p>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-purple-500"></span>
              <span className="text-[10px] text-purple-400">Imports</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-500"></span>
              <span className="text-[10px] text-blue-400">State</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-green-500"></span>
              <span className="text-[10px] text-green-400">Function</span>
            </span>
          </div>
        </div>
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto">
        {categoryOrder.map((category) => {
          const categoryBlocks = blocksByCategory.get(category);
          if (!categoryBlocks || categoryBlocks.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const counts = availableCountByCategory.get(category);

          return (
            <div key={category} className={`border-l-4 ${categoryBorderColors[category]} mb-4 mx-2 rounded-r bg-neutral-800/30`}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between
                         text-sm font-medium hover:bg-neutral-800/50 rounded-r"
              >
                <span className={categoryColors[category]}>{categoryLabels[category]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    <span className="text-green-500">{counts?.available || 0}</span>
                    <span className="text-neutral-600">/{counts?.total || 0}</span>
                  </span>
                  {isExpanded ? (
                    <Minus size={14} className="text-neutral-500" />
                  ) : (
                    <Plus size={14} className="text-neutral-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {categoryBlocks.map((block) => (
                    <DraggableBlock
                      key={block.id}
                      block={block}
                      availability={availability.blocks.get(block.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/80">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>
            <span className="text-green-500">{availability.stats.available}</span>
            <span className="text-neutral-600">/{availability.stats.total} available</span>
          </span>
          <span className="font-mono">FHEVM v0.10</span>
        </div>
      </div>
    </div>
  );
}
