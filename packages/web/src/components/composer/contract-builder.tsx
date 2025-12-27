'use client';

/**
 * Contract Builder Component
 *
 * Right side panel with drop zones for building contracts
 */

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Plus, Settings, ChevronDown, ChevronRight, Edit3, Check, Eye, Search, FileCode, Info } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { getBlockById, type ProjectBlock, type ProjectFunction, type ZoneType, type ValidationResult, type Block } from '@labz/core/blocks';
import { useState, useEffect, useRef } from 'react';
import { BlockConfigEditor } from './block-config-editor';
import { GLOSSARY, getTerm, type GlossaryTerm } from '@/lib/glossary';

// Get FHE method description from glossary
function getFHEMethodInfo(methodName: string): GlossaryTerm | undefined {
  // Try exact match first
  let term = getTerm(methodName);
  if (term) return term;

  // Try with FHE. prefix
  term = getTerm(`FHE.${methodName}`);
  if (term) return term;

  // Try extracting method name from full call
  const match = methodName.match(/FHE\.(\w+)/);
  if (match) {
    return getTerm(`FHE.${match[1]}`);
  }

  return undefined;
}

// Template type from API
interface Template {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  contractCode: string;
  testCode: string;
}

interface ContractBuilderProps {
  activeBlock?: Block | null;
  overZoneType?: ZoneType | null;
  dropSuccess?: { zone: ZoneType; timestamp: number } | null;
}

interface DropZoneProps {
  id: string;
  zoneType: ZoneType;
  label: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  validationResult?: ValidationResult | null;
  isOver?: boolean;
  activeBlock?: Block | null;
  showSuccess?: boolean;
}

// Zone color scheme matching block-library
const zoneColors: Record<ZoneType, { border: string; bg: string; text: string; hint: string }> = {
  'imports': {
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    hint: 'Drop import blocks here (IMP)'
  },
  'state': {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    hint: 'Drop state variable blocks here (STATE)'
  },
  'function-body': {
    border: 'border-green-500/50',
    bg: 'bg-green-500/5',
    text: 'text-green-400',
    hint: 'Drop function blocks here (FUNC)'
  },
  'constructor': {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-400',
    hint: 'Drop constructor blocks here'
  },
  'function-params': {
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    hint: 'Drop parameter blocks here'
  },
  'modifier-body': {
    border: 'border-indigo-500/50',
    bg: 'bg-indigo-500/5',
    text: 'text-indigo-400',
    hint: 'Drop modifier blocks here'
  }
};

function DropZone({ id, zoneType, label, children, isEmpty, validationResult, isOver, activeBlock, showSuccess }: DropZoneProps) {
  const { setNodeRef, isOver: zoneIsOver, active } = useDroppable({
    id,
    data: { zoneType }
  });

  const showHighlight = isOver || zoneIsOver;
  const isValid = !validationResult || validationResult.valid;
  const colors = zoneColors[zoneType] || zoneColors['function-body'];

  // Check if this zone can accept the currently dragged block
  const canAcceptBlock = activeBlock?.canDropIn?.includes(zoneType) ?? false;
  const isDragging = !!active;

  let borderColor = colors.border;
  let bgColor = isEmpty ? colors.bg : 'bg-transparent';
  let extraClasses = '';

  if (showSuccess) {
    // Success animation
    borderColor = 'border-green-400';
    bgColor = 'bg-green-500/20';
    extraClasses = 'animate-pulse ring-2 ring-green-400/50';
  } else if (showHighlight) {
    if (isValid) {
      borderColor = 'border-green-500 border-solid';
      bgColor = 'bg-green-500/15';
      extraClasses = 'ring-2 ring-green-500/30 scale-[1.01]';
    } else {
      borderColor = 'border-red-500 border-solid';
      bgColor = 'bg-red-500/15';
      extraClasses = 'ring-2 ring-red-500/30';
    }
  } else if (isDragging && canAcceptBlock) {
    // Highlight zones that CAN accept this block type
    borderColor = colors.border.replace('/50', '') + ' border-solid';
    bgColor = colors.bg.replace('/5', '/10');
    extraClasses = 'ring-1 ring-offset-1 ring-offset-neutral-950 ' + colors.border.replace('border-', 'ring-').replace('/50', '/30');
  } else if (isDragging && !canAcceptBlock) {
    // Dim zones that cannot accept this block
    borderColor = 'border-neutral-700';
    bgColor = 'bg-neutral-900/50';
    extraClasses = 'opacity-50';
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded border-2 border-dashed
        transition-all duration-150 ease-out
        ${borderColor} ${bgColor} ${extraClasses}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-800/50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {showSuccess ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <span className={`w-2 h-2 rounded-sm ${colors.border.replace('/50', '').replace('border-', 'bg-')}`}></span>
          )}
          <span className={`text-xs font-medium uppercase tracking-wide ${showSuccess ? 'text-green-400' : colors.text}`}>
            {showSuccess ? 'Added!' : label}
          </span>
        </div>
        <span className="text-[10px] text-neutral-600 font-mono">{zoneType}</span>
      </div>

      {/* Content area - main drop target */}
      <div className="p-2 space-y-1 min-h-[80px]">
        {children}
        {isEmpty && !showHighlight && (
          <div className={`py-6 text-center ${isDragging && canAcceptBlock ? 'text-white' : colors.text + ' opacity-60'}`}>
            <div className="text-sm font-medium">{colors.hint}</div>
            {isDragging && canAcceptBlock && (
              <div className="text-xs mt-1 text-green-400 animate-pulse">
                Drop here!
              </div>
            )}
          </div>
        )}
        {showHighlight && isValid && (
          <div className="py-4 text-center">
            <div className="text-sm text-green-400 font-medium animate-pulse">
              Release to add block
            </div>
          </div>
        )}
      </div>

      {/* Validation messages */}
      {showHighlight && validationResult && !validationResult.valid && (
        <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
          {validationResult.errors.map((error, i) => (
            <p key={i} className="text-xs text-red-400">{error}</p>
          ))}
        </div>
      )}

      {showHighlight && validationResult?.warnings && validationResult.warnings.length > 0 && (
        <div className="px-3 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          {validationResult.warnings.map((warning, i) => (
            <p key={i} className="text-xs text-yellow-400">{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface SortableBlockProps {
  block: ProjectBlock;
  onRemove: () => void;
  onSave?: (config: Record<string, string>) => void;
  onLocate?: () => void;
}

function SortableBlock({ block, onRemove, onSave, onLocate }: SortableBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const blockDef = getBlockById(block.blockId);
  const hasParams = blockDef?.params && blockDef.params.length > 0;

  // Check if this is an FHE method and get info
  const fheMethodName = block.config?.name || block.config?.fullCall || blockDef?.name || '';
  const fheInfo = getFHEMethodInfo(fheMethodName);
  const isFHEBlock = block.blockId.startsWith('op-') || fheMethodName.includes('FHE.');

  const handleSave = (config: Record<string, string>) => {
    onSave?.(config);
    setIsEditing(false);
  };

  // If editing, show the editor
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <BlockConfigEditor
          block={block}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="space-y-0" data-block-id={block.id}>
      <div
        onClick={() => onLocate?.()}
        className={`
          group flex items-center gap-2 p-2 bg-neutral-800 rounded-t border border-neutral-700
          hover:border-neutral-600 transition-all cursor-pointer
          ${isDragging ? 'opacity-50 shadow-lg' : ''}
          ${showDetail ? 'rounded-b-none border-b-0' : 'rounded-b'}
        `}
      >
        <button
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white truncate">
              {block.config?.name
                ? (block.config.name.includes('(') ? block.config.name : `${block.config.name}()`)
                : blockDef?.name || block.blockId}
            </span>
            {blockDef?.outputType && (
              <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded">
                {blockDef.outputType}
              </span>
            )}
          </div>
          {Object.keys(block.config).length > 0 && (
            <div className="text-xs text-neutral-500 truncate mt-0.5">
              {Object.entries(block.config)
                .filter(([k]) => k !== 'line' && k !== 'column')
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* +Detail button for FHE blocks */}
          {isFHEBlock && fheInfo && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}
              className={`p-1 transition-colors ${showDetail ? 'text-blue-400' : 'text-neutral-600 hover:text-blue-400'}`}
              title={showDetail ? 'Hide details' : 'Show FHE details'}
            >
              <Info size={14} />
            </button>
          )}
          {onLocate && (
            <button
              onClick={(e) => { e.stopPropagation(); onLocate(); }}
              className="p-1 text-neutral-600 hover:text-yellow-400"
              title="Locate in code"
            >
              <Eye size={14} />
            </button>
          )}
          {hasParams && onSave && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 text-neutral-600 hover:text-blue-400"
              title="Edit configuration"
            >
              <Settings size={14} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-neutral-600 hover:text-red-400"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expandable Detail Panel for FHE methods */}
      {showDetail && fheInfo && (
        <div className="px-3 py-2 bg-neutral-900 border border-neutral-700 border-t-0 rounded-b text-xs">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-blue-400 font-medium mb-1">{fheInfo.short}</p>
              <p className="text-neutral-400 leading-relaxed">{fheInfo.long}</p>
              {fheInfo.example && (
                <code className="block mt-2 p-2 bg-neutral-800 rounded text-[10px] text-green-400 font-mono">
                  {fheInfo.example}
                </code>
              )}
              {fheInfo.related && fheInfo.related.length > 0 && (
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <span className="text-neutral-600">Related:</span>
                  {fheInfo.related.map(r => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FunctionSectionProps {
  fn: ProjectFunction;
  isSelected: boolean;
  onSelect: () => void;
  validationResult?: ValidationResult | null;
  isOver?: boolean;
  activeBlock?: Block | null;
  showSuccess?: boolean;
  onLocateBlock?: (blockId: string) => void;
  onSaveBlock?: (blockId: string, config: Record<string, string>) => void;
  onLocateFunction?: () => void;
}

function FunctionSection({ fn, isSelected, onSelect, validationResult, isOver, activeBlock, showSuccess, onLocateBlock, onSaveBlock, onLocateFunction }: FunctionSectionProps) {
  const { removeFunction, removeFromFunctionBody, updateFunction } = useProjectStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fn.name);

  const handleSaveName = () => {
    updateFunction(fn.id, { name: editName });
    setIsEditing(false);
  };

  return (
    <div
      data-block-id={fn.id}
      className={`
        border rounded transition-all
        ${isSelected ? 'border-blue-500 bg-blue-500/5' : 'border-neutral-800 bg-neutral-900/50'}
      `}
    >
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50"
        onClick={() => {
          onSelect();
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown size={14} className="text-neutral-500" />
          ) : (
            <ChevronRight size={14} className="text-neutral-500" />
          )}

          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <span className="font-mono text-sm text-white">{fn.name}()</span>
          )}

          <span className="text-[10px] text-neutral-600 font-mono">
            {fn.visibility}
            {fn.stateMutability ? ` ${fn.stateMutability}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onLocateFunction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLocateFunction();
              }}
              className="p-1 text-neutral-600 hover:text-yellow-400"
              title="Locate in code"
            >
              <Eye size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 text-neutral-600 hover:text-blue-400"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFunction(fn.id);
            }}
            className="p-1 text-neutral-600 hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3">
          <DropZone
            id={`function-body-${fn.id}`}
            zoneType="function-body"
            label="Function Body"
            isEmpty={fn.body.length === 0}
            validationResult={validationResult}
            isOver={isOver}
            activeBlock={activeBlock}
            showSuccess={showSuccess}
          >
            <SortableContext
              items={fn.body.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {fn.body.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onRemove={() => removeFromFunctionBody(fn.id, block.id)}
                  onSave={onSaveBlock ? (config) => onSaveBlock(block.id, config) : undefined}
                  onLocate={onLocateBlock ? () => onLocateBlock(block.id) : undefined}
                />
              ))}
            </SortableContext>
          </DropZone>
        </div>
      )}
    </div>
  );
}

// Template Selector Dropdown Component
function TemplateSelector({ onSelect }: { onSelect: (template: Template) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      try {
        const res = await fetch('/api/templates');
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
      setLoading(false);
    }
    loadTemplates();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    advanced: 'bg-red-500'
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
      >
        <FileCode size={14} className="text-blue-400" />
        <span className="text-neutral-300">Load Template</span>
        <ChevronDown size={12} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-neutral-800">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:border-blue-500 text-white placeholder-neutral-500"
                autoFocus
              />
            </div>
          </div>

          {/* Template List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-neutral-500 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">No templates found</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelect(t);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full p-3 text-left hover:bg-neutral-800 border-b border-neutral-800/50 last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${difficultyColors[t.difficulty] || 'bg-neutral-500'}`} />
                    <span className="font-mono text-sm text-white">{t.name}</span>
                    <span className="text-[10px] text-neutral-500 ml-auto">{t.category}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{t.description}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContractBuilder({ activeBlock, overZoneType, dropSuccess }: ContractBuilderProps) {
  const {
    project,
    selectedFunctionId,
    selectFunction,
    removeStateVariable,
    updateStateVariable,
    removeImport,
    updateImport,
    addFunction,
    updateFunctionBodyBlock,
    validationResult,
    setHighlightedBlockId,
    setLoadedTemplate,
    highlightedBlockId
  } = useProjectStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted element when highlightedBlockId changes
  useEffect(() => {
    if (!highlightedBlockId || !scrollContainerRef.current) return;

    // Find the element with data-block-id matching highlightedBlockId
    const element = scrollContainerRef.current.querySelector(`[data-block-id="${highlightedBlockId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      element.classList.add('ring-2', 'ring-yellow-400');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-yellow-400');
      }, 2000);
    }
  }, [highlightedBlockId]);

  const handleAddFunction = () => {
    const id = `fn-${Date.now()}`;
    addFunction({
      id,
      name: `newFunction${project.functions.length + 1}`,
      visibility: 'external',
      params: [],
      body: []
    });
  };

  const handleTemplateSelect = (template: Template) => {
    // Parse contract and load into project state
    useProjectStore.getState().loadFromContract(template.contractCode, {
      id: template.id,
      name: template.name,
      testCode: template.testCode
    });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Contract Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <input
              type="text"
              value={project.name}
              onChange={(e) => useProjectStore.getState().setProjectName(e.target.value)}
              className="bg-transparent text-xl font-mono font-bold text-white focus:outline-none border-b border-transparent focus:border-neutral-600"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {project.inherits.length > 0 ? `is ${project.inherits.join(', ')}` : 'is SepoliaConfig'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TemplateSelector onSelect={handleTemplateSelect} />
            <div className="text-xs text-neutral-600 font-mono">
              Solidity ^0.8.24
            </div>
          </div>
        </div>
      </div>

      {/* Contract Body */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Imports Zone */}
        <DropZone
          id="imports-zone"
          zoneType="imports"
          label="Imports"
          isEmpty={project.imports.length === 0}
          activeBlock={activeBlock}
          showSuccess={dropSuccess?.zone === 'imports'}
        >
          <SortableContext
            items={project.imports.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {project.imports.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onRemove={() => removeImport(block.id)}
                onSave={(config) => updateImport(block.id, config)}
                onLocate={() => setHighlightedBlockId(block.id)}
              />
            ))}
          </SortableContext>
        </DropZone>

        {/* State Variables Zone */}
        <DropZone
          id="state-zone"
          zoneType="state"
          label="State Variables"
          isEmpty={project.stateVariables.length === 0}
          activeBlock={activeBlock}
          showSuccess={dropSuccess?.zone === 'state'}
        >
          <SortableContext
            items={project.stateVariables.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {project.stateVariables.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onRemove={() => removeStateVariable(block.id)}
                onSave={(config) => updateStateVariable(block.id, config)}
                onLocate={() => setHighlightedBlockId(block.id)}
              />
            ))}
          </SortableContext>
        </DropZone>

        {/* Functions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Functions
            </span>
            <button
              onClick={handleAddFunction}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white
                       bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              <Plus size={12} />
              Add Function
            </button>
          </div>

          {project.functions.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-neutral-800 rounded">
              <p className="text-neutral-600 text-sm">No functions yet</p>
              <button
                onClick={handleAddFunction}
                className="mt-2 text-xs text-blue-500 hover:text-blue-400"
              >
                + Add your first function
              </button>
            </div>
          ) : (
            project.functions.map((fn) => (
              <FunctionSection
                key={fn.id}
                fn={fn}
                isSelected={fn.id === selectedFunctionId}
                onSelect={() => selectFunction(fn.id)}
                validationResult={
                  selectedFunctionId === fn.id ? validationResult : null
                }
                activeBlock={activeBlock}
                showSuccess={dropSuccess?.zone === 'function-body'}
                onLocateBlock={setHighlightedBlockId}
                onSaveBlock={(blockId, config) => updateFunctionBodyBlock(fn.id, blockId, config)}
                onLocateFunction={() => setHighlightedBlockId(fn.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/80">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-4 text-neutral-500">
            <span>{project.imports.length} imports</span>
            <span>{project.stateVariables.length} state vars</span>
            <span>{project.functions.length} functions</span>
          </div>
          {validationResult && !validationResult.valid && (
            <span className="text-red-400">
              {validationResult.errors.length} error(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
