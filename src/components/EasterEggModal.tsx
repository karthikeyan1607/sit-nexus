import React from 'react';
import { X, Sparkles, Heart } from 'lucide-react';
import { CaterpillarLogo } from './CaterpillarLogo';

interface EasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EasterEggModal: React.FC<EasterEggModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-[#9CA3AF] hover:text-[#374151] rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <CaterpillarLogo height={24} />
          <div>
            <h3 className="text-sm font-bold text-[#111827] font-sans">SIT Nexus</h3>
            <p className="text-[10px] text-[#6B7280] font-mono">Platform Intelligence</p>
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] p-3.5 my-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#374151] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Built with care by the SIT Energizers team.</span>
          </div>
          <div className="border-t border-[#F1F3F5] pt-2 text-[11px] text-[#6B7280] flex items-center justify-between">
            <span>Engineering &amp; Architecture:</span>
            <span className="font-semibold text-[#111827]">Karthikeyan R</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-2 bg-[#FFCD11] hover:bg-[#F2C200] text-[#1C1C1C] font-mono font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
