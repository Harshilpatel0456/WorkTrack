import React, { useState, useRef } from 'react';
import {
  Camera,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  User,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  X,
  RefreshCw,
  Loader2,
  Edit2,
  Check,
} from 'lucide-react';
import { processImageFile, formatFileSize } from '../../services/imageUtils';

export const CameraSnapshotCard = ({
  snapshot,
  batchId,
  onVerify,
  onUploadImage,
  onRemoveImage,
  onPreviewImage,
  isReadOnly = false,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(snapshot.employeeNotes || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localPreviewModalOpen, setLocalPreviewModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleStatusChange = (newStatus) => {
    if (isReadOnly) return;
    onVerify?.(batchId, snapshot.id, newStatus, notesText);
  };

  const handleSaveNotes = () => {
    onVerify?.(batchId, snapshot.id, snapshot.employeeVerification, notesText);
    setIsEditingNotes(false);
  };

  const handleTriggerFileInput = (e) => {
    e?.stopPropagation();
    if (isReadOnly) return;
    fileInputRef.current?.click();
  };

  const handleProcessAndUpload = async (file) => {
    if (!file || isReadOnly) return;
    try {
      setIsUploading(true);
      const processed = await processImageFile(file, 1280, 960, 0.85);
      if (onUploadImage) {
        onUploadImage(batchId, snapshot.id, processed);
      }
    } catch (err) {
      console.error('Image processing error:', err);
      alert(err.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessAndUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isReadOnly) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isReadOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleProcessAndUpload(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (window.confirm(`Remove uploaded photo for ${snapshot.cameraName}?`)) {
      onRemoveImage?.(batchId, snapshot.id);
    }
  };

  const handleOpenPreview = (e) => {
    e?.stopPropagation();
    if (snapshot.imageUrl) {
      if (onPreviewImage) {
        onPreviewImage({
          url: snapshot.imageUrl,
          title: `${snapshot.cameraName} (${snapshot.cameraId})`,
          subtitle: `${snapshot.zone} • ${snapshot.time}`,
          meta: snapshot.imageMeta,
        });
      } else {
        setLocalPreviewModalOpen(true);
      }
    }
  };

  const isSuspicious = snapshot.employeeVerification === 'Flagged Suspicious' || snapshot.aiStatus === 'Suspicious';
  const hasUploadedImage = Boolean(snapshot.imageUrl);

  // Dynamic label based on camera position
  const getCameraLabel = (type = '', isAnomaly) => {
    const safeType = String(type || '').toLowerCase();
    if (safeType.includes('register') || String(snapshot.cameraId || '').includes('01') || String(snapshot.cameraId || '').includes('02')) {
      return isAnomaly ? 'UNATTENDED CASH DRAWER DETECTED' : 'FRONT CASH REGISTER #1 & #2';
    } else if (safeType.includes('safe') || String(snapshot.cameraId || '').includes('03')) {
      return isAnomaly ? 'HUMAN DETECTED AT SAFE VAULT' : 'SAFE ROOM - RESTRICTED ACCESS';
    } else if (safeType.includes('jewelry') || String(snapshot.cameraId || '').includes('04')) {
      return 'LOCKED DISPLAY CABINET - HIGH VALUE';
    } else if (safeType.includes('exit') || String(snapshot.cameraId || '').includes('05')) {
      return 'EMERGENCY REAR ALLEYWAY EXIT';
    } else if (safeType.includes('loading') || String(snapshot.cameraId || '').includes('06')) {
      return 'FREIGHT RECEIVING DOCK';
    } else if (safeType.includes('pharmacy') || String(snapshot.cameraId || '').includes('07')) {
      return 'SALES FLOOR & AISLES';
    } else if (safeType.includes('entrance') || String(snapshot.cameraId || '').includes('08')) {
      return 'FRONT ENTRANCE & TURNSTILES';
    }
    return 'STORE CCTV FEED';
  };

  const label = getCameraLabel(snapshot.simulatedVisual || snapshot.cameraId || 'normal', snapshot.aiStatus === 'Suspicious');

  return (
    <div
      className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
        isSuspicious
          ? 'border-amber-300 shadow-md ring-1 ring-amber-400/30'
          : 'border-slate-200/90 shadow-subtle hover:shadow-card'
      }`}
    >
      <div>
        {/* Header: Camera Name, Zone & Action Controls */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#245CE2] flex-shrink-0" />
              <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px] sm:max-w-[260px]">
                {snapshot.cameraName}
              </h4>
              {hasUploadedImage && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <ImageIcon className="w-2.5 h-2.5" />
                  Photo Added
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{snapshot.zone}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {snapshot.isHighRisk && (
              <span className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Robbery Hotspot
              </span>
            )}

            {!isReadOnly && onUploadImage && (
              <button
                type="button"
                onClick={handleTriggerFileInput}
                title={hasUploadedImage ? 'Replace uploaded image' : 'Upload snapshot photo'}
                disabled={isUploading}
                className={`p-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  hasUploadedImage
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-blue-50 hover:bg-blue-100 text-[#245CE2] border-blue-200 shadow-xs'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : hasUploadedImage ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Upload</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* CCTV Viewport / Image Display */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative h-48 rounded-xl overflow-hidden border p-3 flex flex-col justify-between select-none group transition-all ${
            isDragOver
              ? 'border-[#245CE2] ring-2 ring-[#245CE2]/40 bg-blue-900/30'
              : 'border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950'
          }`}
        >
          {/* Real Uploaded Photo Layer */}
          {hasUploadedImage ? (
            <>
              <img
                src={snapshot.imageUrl}
                alt={snapshot.cameraName}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/70 pointer-events-none" />
            </>
          ) : (
            <>
              {/* Subtle grid pattern for CCTV simulation */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            </>
          )}

          {/* Top CCTV Overlay */}
          <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-200">
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400">REC</span>
              <span className="text-slate-400">|</span>
              <span className="font-bold text-white">{snapshot.cameraId}</span>
              {hasUploadedImage && (
                <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 rounded uppercase font-sans font-bold ml-1">
                  LIVE SNAP
                </span>
              )}
            </div>
            <span className="text-slate-300 bg-black/60 px-2.5 py-0.5 rounded backdrop-blur-xs font-mono text-xs">
              {snapshot.time}
            </span>
          </div>

          {/* Center Graphic: Human Detection Box OR Drag-and-drop prompt */}
          <div className="relative z-10 flex items-center justify-center flex-1">
            {isUploading ? (
              <div className="bg-slate-900/90 border border-[#245CE2] rounded-xl p-3 px-5 text-center text-white flex items-center gap-2 shadow-lg backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#245CE2]" />
                <span className="text-xs font-semibold">Optimizing snapshot image...</span>
              </div>
            ) : isDragOver ? (
              <div className="bg-blue-600/90 border-2 border-dashed border-white rounded-xl p-3 px-6 text-center text-white backdrop-blur-sm shadow-xl animate-pulse">
                <Upload className="w-6 h-6 mx-auto mb-1 text-white" />
                <span className="text-xs font-bold block">Drop Photo to Upload</span>
                <span className="text-[10px] text-blue-100">Supports JPEG, PNG, WebP</span>
              </div>
            ) : !hasUploadedImage ? (
              <div className="flex flex-col items-center gap-2">
                {snapshot.humanDetected ? (
                  <div
                    className={`border-2 border-dashed ${
                      snapshot.aiStatus === 'Suspicious'
                        ? 'border-rose-400 bg-rose-500/10'
                        : 'border-emerald-400/90 bg-emerald-500/10'
                    } rounded-xl px-4 py-2.5 text-center backdrop-blur-xs shadow-inner`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-white mb-0.5">
                      <User
                        className={`w-3.5 h-3.5 ${
                          snapshot.aiStatus === 'Suspicious' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      />
                      <span>
                        {snapshot.humanCount} Human{snapshot.humanCount === 1 ? '' : 's'} Detected
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        snapshot.aiStatus === 'Suspicious' ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      AI Confidence: {snapshot.aiConfidence}
                    </span>
                  </div>
                ) : (
                  <div className="border border-slate-700/60 rounded-lg p-2 text-center text-slate-500 text-[11px] bg-slate-900/60 backdrop-blur-xs">
                    <span>Zero Human Motion Detected</span>
                  </div>
                )}

                {/* Quick Upload CTA Overlay for empty image */}
                {!isReadOnly && onUploadImage && (
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 hover:bg-black/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-600 flex items-center gap-1.5 backdrop-blur-xs shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#245CE2]" />
                    Upload Actual Camera Photo
                  </button>
                )}
              </div>
            ) : (
              /* Floating action bar when image exists on hover */
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/80 p-1.5 px-3 rounded-xl border border-slate-700 backdrop-blur-md shadow-xl">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  title="View full resolution"
                  className="text-white hover:text-blue-300 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                {!isReadOnly && onUploadImage && (
                  <>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleTriggerFileInput}
                      title="Replace photo"
                      className="text-white hover:text-blue-300 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>
                  </>
                )}

                {!isReadOnly && onRemoveImage && (
                  <>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleRemove}
                      title="Remove uploaded image"
                      className="text-rose-400 hover:text-rose-300 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom CCTV Zone Overlay */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/70 -mx-3 -mb-3 px-3 py-1.5 border-t border-slate-800/80 backdrop-blur-xs">
            <span className="truncate uppercase font-bold text-slate-200">{label}</span>
            <div className="flex items-center gap-2">
              {hasUploadedImage && snapshot.imageMeta?.size && (
                <span className="text-slate-400 font-sans text-[10px]">
                  {formatFileSize(snapshot.imageMeta.size)}
                </span>
              )}
              <span className="text-slate-200 font-bold truncate max-w-[130px]">
                {snapshot?.zone ? snapshot.zone.split('(')[0] : 'Store Hotspot'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Pre-Analysis Callout Banner (Matching Screenshot exactly) */}
        <div className="mt-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs leading-relaxed space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              AI SNAPSHOT PRE-ANALYSIS:
            </span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                snapshot.aiStatus === 'Suspicious'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {snapshot.aiStatus === 'Suspicious' ? 'SUSPICIOUS' : 'OK / NORMAL'}
            </span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed font-normal">
            {snapshot.aiAnalysis}
          </p>
        </div>

        {/* Human Operator Review Section */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              HUMAN OPERATOR VERIFICATION:
            </span>
            <span
              className={`font-bold text-xs ${
                snapshot.employeeVerification === 'Flagged Suspicious'
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {snapshot.employeeVerification}
            </span>
          </div>

          {!isReadOnly && onVerify && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('Verified OK')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  snapshot.employeeVerification === 'Verified OK'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified OK
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('Flagged Suspicious')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  snapshot.employeeVerification === 'Flagged Suspicious'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-rose-50 text-slate-600 border-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag Suspicious
              </button>
            </div>
          )}

          {/* Operator notes field with click-to-edit */}
          {isEditingNotes ? (
            <div className="space-y-1.5">
              <input
                type="text"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Operator observations, supervisor notified..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white transition-all text-slate-800"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1 bg-[#245CE2] hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save Note
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !isReadOnly && setIsEditingNotes(true)}
              className={`p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-normal flex items-start justify-between gap-2 ${
                !isReadOnly ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors' : ''
              }`}
              title={!isReadOnly ? 'Click to edit operator note' : undefined}
            >
              <div>
                <span className="font-semibold text-slate-800">Operator Note: </span>
                <span className={snapshot.employeeNotes ? 'text-slate-700' : 'text-slate-400 italic'}>
                  {snapshot.employeeNotes || (isReadOnly ? 'No notes.' : 'Standard register operation.')}
                </span>
              </div>
              {!isReadOnly && (
                <Edit2 className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Local Full Image Preview Modal */}
      {localPreviewModalOpen && snapshot.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLocalPreviewModalOpen(false)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 text-white bg-slate-950">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#245CE2]" />
                <span className="font-bold text-sm">{snapshot.cameraName}</span>
                <span className="text-xs text-slate-400 font-mono">({snapshot.cameraId})</span>
              </div>
              <button
                type="button"
                onClick={() => setLocalPreviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex items-center justify-center bg-black overflow-auto max-h-[75vh]">
              <img
                src={snapshot.imageUrl}
                alt={snapshot.cameraName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
              <span>{snapshot.zone} • Captured {snapshot.time}</span>
              {snapshot.imageMeta?.name && (
                <span className="font-mono text-[11px] text-slate-500">
                  {snapshot.imageMeta.name} ({formatFileSize(snapshot.imageMeta.size)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
