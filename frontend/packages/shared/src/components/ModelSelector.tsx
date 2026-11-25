import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Cpu, Brain, Check } from 'lucide-react';
import type { AppMode, ModelOption } from '../services/chatApi';

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Ultra-fast and lightweight',
    icon: 'zap',
    badge: 'Recommended',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Deep reasoning and complex tasks',
    icon: 'brain',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Cost-efficient high-throughput model',
    icon: 'cpu',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast and responsive',
    icon: 'sparkles',
  },
];

export const AVAILABLE_MODELS: ModelOption[] = [...GEMINI_MODELS];

const DEFAULT_MODEL = 'gemini-2.5-flash';

const iconMap: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  zap: Zap,
  cpu: Cpu,
  brain: Brain,
};

interface ModelSelectorProps {
  mode: AppMode;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  chatApi: {
    getModels: () => Promise<{ gemini: ModelOption[] }>;
  };
}

export function ModelSelector({ selectedModel, onModelChange, chatApi }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>(GEMINI_MODELS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    chatApi
      .getModels()
      .then((res) => {
        if (active && res && res.gemini?.length > 0) {
          setModels(res.gemini);
        }
      })
      .catch((err) => {
        console.warn('Failed to load models list from API, using defaults:', err);
      });
    return () => {
      active = false;
    };
  }, [chatApi]);

  const currentModelsList = models;
  const selected = currentModelsList.find((m) => m.id === selectedModel) ?? currentModelsList[0];
  const SelectedIcon = iconMap[selected.icon] ?? Sparkles;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative" style={{ zIndex: 50 }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors duration-150 border select-none ${
          isOpen
            ? 'bg-[var(--bh-nile-soft)] border-[var(--bh-cerulean)] text-[var(--bh-nile)]'
            : 'bg-[var(--surface-warm)] border-[var(--border)] text-[var(--fg-2)] hover:bg-[var(--surface)] hover:border-[var(--bh-cerulean)] hover:text-[var(--bh-nile)]'
        }`}
        title="Select AI Model"
        id="model-selector-btn"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <SelectedIcon className="w-3.5 h-3.5 shrink-0 text-[var(--bh-cerulean)]" />
        <span className="truncate max-w-[140px]">{selected.name}</span>
        <ChevronDown
          className="w-3 h-3 shrink-0 text-[var(--muted)] transition-transform duration-150"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select AI Model"
          className="absolute left-0 top-full mt-2 w-72 rounded-2xl shadow-[var(--elev-modal)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          style={{
            animation: 'modelDropdownIn 180ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          <div className="px-4 pt-3 pb-2 border-b border-[var(--border-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
              Select Model
            </p>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
            {currentModelsList.map((model) => {
              const Icon = iconMap[model.icon] ?? Sparkles;
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-150 text-left border ${
                    isSelected
                      ? 'bg-[var(--bh-nile-soft)] border-[#C6DCE5]'
                      : 'bg-transparent border-transparent hover:bg-[var(--surface-warm)]'
                  }`}
                  id={`model-option-${model.id}`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-[var(--bh-nile)] text-white' : 'bg-[var(--surface-subtle)] text-[var(--muted)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-[var(--bh-nile)]' : 'text-[var(--fg)]'
                        }`}
                      >
                        {model.name}
                      </span>
                      {model.badge && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-md ${
                            model.badge === 'New'
                              ? 'bg-[var(--bh-emerald-soft)] text-[var(--bh-emerald)]'
                              : 'bg-[var(--bh-buttercup-soft)] text-[#7D5B00]'
                          }`}
                        >
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{model.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--bh-nile)] mt-1 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_MODEL };
