import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Cpu, Brain } from 'lucide-react';
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

export function ModelSelector({ mode, selectedModel, onModelChange, chatApi }: ModelSelectorProps) {
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

  const accentColor = mode === 'ga4' ? '#e8710a' : '#1a3a5c';
  const accentLight = mode === 'ga4' ? '#fef3e8' : '#e8eef4';
  const accentBorder = mode === 'ga4' ? '#f5e0cc' : '#dce4ec';

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative" style={{ zIndex: 50 }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border select-none"
        style={{
          backgroundColor: isOpen ? accentLight : '#fafbfc',
          borderColor: isOpen ? accentBorder : '#e5e7eb',
          color: isOpen ? accentColor : '#4b5563',
        }}
        title="Select AI Model"
        id="model-selector-btn"
      >
        <SelectedIcon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
        <span className="truncate max-w-[140px]">{selected.name}</span>
        <ChevronDown
          className="w-3 h-3 shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-72 rounded-2xl shadow-2xl border overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            animation: 'modelDropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Select Model
            </p>
          </div>
          <div className="px-2 pb-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: '320px' }}>
            {currentModelsList.map((model) => {
              const Icon = iconMap[model.icon] ?? Sparkles;
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left group hover:bg-gray-50"
                  style={{
                    backgroundColor: isSelected ? accentLight : undefined,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isSelected ? accentBorder : 'transparent',
                  }}
                  id={`model-option-${model.id}`}
                >
                  <div
                    className="mt-0.5 p-1.5 rounded-lg shrink-0"
                    style={{
                      backgroundColor: isSelected ? accentColor : '#f3f4f6',
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: isSelected ? '#ffffff' : '#9ca3af' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: isSelected ? accentColor : '#374151' }}
                      >
                        {model.name}
                      </span>
                      {model.badge && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: model.badge === 'New' ? '#ecfdf5' : accentLight,
                            color: model.badge === 'New' ? '#059669' : accentColor,
                          }}
                        >
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{model.description}</p>
                  </div>
                  {isSelected && (
                    <div className="mt-1 shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>
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
