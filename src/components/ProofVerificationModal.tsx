import React, { useState } from 'react';
import { Camera, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { Goal } from '../types';
import { aiClient } from '../services/aiClient';

interface ProofVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal;
  onVerified: (goalId: string, resultMessage: string, confidence?: number, evidenceSummary?: string) => void;
}

export const ProofVerificationModal: React.FC<ProofVerificationModalProps> = ({
  isOpen,
  onClose,
  goal,
  onVerified,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ verified: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!selectedImage) return;
    setLoading(true);

    try {
      const data = await aiClient.verifyProof({
        imageBase64: selectedImage,
        mimeType: 'image/jpeg',
        goalName: goal?.name || 'Habit Completion',
        goalDescription: goal?.description || '',
      });

      setScanResult({
        verified: data.verified ?? false,
        message: data.message || 'Proof media reviewed.',
      });

      if (goal?.id && data.verified) {
        onVerified(goal.id, data.message || 'Proof verified', data.confidence, data.evidenceSummary);
      }
    } catch (err) {
      setScanResult({
        verified: false,
        message: 'NEXUS could not verify this image yet. Use the completion review with journal specifics too.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950/95 backdrop-blur-2xl border border-amber-400/40 rounded-2xl max-w-md w-full p-6 sm:p-7 text-zinc-100 shadow-2xl space-y-5 relative ring-1 ring-amber-500/25">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Proof Verification</h3>
            <p className="text-xs text-zinc-400">
              {goal ? `Goal: ${goal.name}` : 'Goal Completion Verification'}
            </p>
          </div>
        </div>

        {/* Mandatory Privacy Notice Banner */}
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <strong className="block text-emerald-300 font-semibold mb-0.5">Privacy Safeguard</strong>
            Uploaded media is analyzed instantly by AI to verify goal plausibility, then immediately discarded.
            <span className="underline ml-1">No images are ever stored or retained on any server or local storage.</span>
          </div>
        </div>

        {/* Upload Zone */}
        {!selectedImage ? (
          <label className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-950 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-zinc-500 mb-2" />
            <span className="text-xs font-medium text-zinc-300">
              Click or drag to select proof photo
            </span>
            <span className="text-[10px] text-zinc-500 mt-1">
              (Gym photo, book/notes, meditation space, meal)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-48 flex items-center justify-center bg-black">
              <img
                src={selectedImage}
                alt="Proof preview"
                className="max-h-48 object-contain"
              />
            </div>

            {scanResult ? (
              <div
                className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
                  scanResult.verified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scanResult.message}</span>
              </div>
            ) : (
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                {loading ? (
                  <span>Analyzing Image with AI Vision...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Vision Verification</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
