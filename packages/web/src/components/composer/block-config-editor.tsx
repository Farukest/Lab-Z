'use client';

/**
 * Block Configuration Editor
 *
 * Inline editor for block parameters (variable names, targets, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { getBlockById, type ProjectBlock, type Block } from '@labz/core/blocks';

interface BlockParam {
  id: string;
  label: string;
  type: string;
  default?: string;
  required?: boolean;
  options?: string[];
  variableType?: string;
}

interface BlockConfigEditorProps {
  block: ProjectBlock;
  onSave: (config: Record<string, string>) => void;
  onCancel: () => void;
}

export function BlockConfigEditor({ block, onSave, onCancel }: BlockConfigEditorProps) {
  const blockDef = getBlockById(block.blockId);
  const [config, setConfig] = useState<Record<string, string>>({ ...block.config });
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on mount
    firstInputRef.current?.focus();
    firstInputRef.current?.select();
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, onCancel]);

  if (!blockDef || !blockDef.params || blockDef.params.length === 0) {
    return (
      <div className="p-3 bg-neutral-900 border border-neutral-700 rounded">
        <p className="text-xs text-neutral-500">No configurable parameters</p>
        <button
          onClick={onCancel}
          className="mt-2 text-xs text-neutral-400 hover:text-white"
        >
          Close
        </button>
      </div>
    );
  }

  const handleSave = () => {
    onSave(config);
  };

  const handleChange = (paramId: string, value: string) => {
    setConfig(prev => ({ ...prev, [paramId]: value }));
  };

  return (
    <div
      className="p-3 bg-neutral-900 border border-neutral-600 rounded shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
        <span className="text-xs font-medium text-neutral-300">
          Edit: {blockDef.name}
        </span>
        <button
          onClick={onCancel}
          className="p-1 text-neutral-500 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        {blockDef.params.map((param: BlockParam, index: number) => (
          <div key={param.id}>
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wide mb-1">
              {param.label}
              {param.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {param.type === 'type-select' && param.options ? (
              <select
                value={config[param.id] || param.default || ''}
                onChange={(e) => handleChange(param.id, e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded
                         text-sm text-white font-mono
                         focus:outline-none focus:border-blue-500"
              >
                {param.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                ref={index === 0 ? firstInputRef : undefined}
                type="text"
                value={config[param.id] || param.default || ''}
                onChange={(e) => handleChange(param.id, e.target.value)}
                placeholder={param.default}
                className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded
                         text-sm text-white font-mono
                         focus:outline-none focus:border-blue-500
                         placeholder:text-neutral-600"
              />
            )}

            {param.variableType && (
              <span className="text-[9px] text-neutral-600 mt-0.5 block">
                Type: {param.variableType}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-800">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white
                   bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-white
                   bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          <Check size={12} />
          Save
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-[9px] text-neutral-600 mt-2 text-center">
        Enter to save, Esc to cancel
      </p>
    </div>
  );
}
