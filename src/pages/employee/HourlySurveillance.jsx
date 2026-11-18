import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CameraSnapshotCard } from '../../components/surveillance/CameraSnapshotCard';
import { Badge } from '../../components/common/Badge';
import { INITIAL_HOURLY_SURVEILLANCE_BATCHES, INITIAL_CAMERAS } from '../../data/initialData';
import { processImageFile, formatFileSize } from '../../services/imageUtils';
import {
  Camera,
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Sparkles,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  X,
  Plus,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Store,
  Layers,
  Sparkle,
} from 'lucide-react';

// Preset time intervals for quick 1-click selection
const PRESET_TIME_WINDOWS = [
  { label: '09:00 AM - 10:00 AM', start: '09:00 AM', end: '10:00 AM', start24: '09:00', end24: '10:00' },
  { label: '11:00 AM - 12:00 PM', start: '11:00 AM', end: '12:00 PM', start24: '11:00', end24: '12:00' },
  { label: '01:00 PM - 03:00 PM', start: '01:00 PM', end: '03:00 PM', start24: '13:00', end24: '15:00' },
  { label: '02:00 PM - 03:00 PM', start: '02:00 PM', end: '03:00 PM', start24: '14:00', end24: '15:00' },
  { label: '03:00 PM - 05:00 PM', start: '03:00 PM', end: '05:00 PM', start24: '15:00', end24: '17:00' },
  { label: '06:00 PM - 08:00 PM', start: '06:00 PM', end: '08:00 PM', start24: '18:00', end24: '20:00' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to get formatted day and ISO date
const getTodayISO = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getDayNameFromISO = (isoDate) => {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return DAYS_OF_WEEK[date.getDay()];
  } catch {
    return 'Wednesday';
  }
};

export const HourlySurveillance = () => {
  const { selectedEmployeeId } = useAuth();
  const {
    surveillanceBatches = [],
    addSurveillanceBatch,
    updateSnapshotVerification,
    uploadSnapshotImage,
    removeSnapshotImage,
    addBatchEvidenceImages,
    removeBatchEvidenceImage,
    submitHourlySurveillanceBatch,
    employees = [],
    customers = [],
    resetDemoData,
    showToast,
  } = useApp();

  const currentEmp = employees?.find((e) => e.id === selectedEmployeeId) || employees?.[0] || { id: 'emp-1', name: 'Aarav Shah' };

  // Guarantee valid list of stores
  const storeList = useMemo(() => {
    return Array.isArray(customers) && customers.length > 0
      ? customers
      : [
          { id: 'cust-1', companyName: 'Acme Retail Store #104 (US Flagship)', storeCode: 'STORE-US-104', address: '104 Michigan Ave, Chicago, IL' },
          { id: 'cust-2', companyName: 'Northstar Logistics & Cargo Hub', storeCode: 'STORE-US-208', address: '780 Freight Blvd, Dallas, TX' },
          { id: 'cust-3', companyName: 'Vertex Solutions Labs', storeCode: 'STORE-US-312', address: '42 Silicon Way, Austin, TX' },
        ];
  }, [customers]);

  // Selected store for filtering & batch creation
  const [selectedStoreId, setSelectedStoreId] = useState(() => storeList[0]?.id || 'cust-1');
  const activeStore = storeList.find((s) => s.id === selectedStoreId) || storeList[0];

  // ----------------------------------------------------
  // Top Upload Section State (Time, Day/Date, Store, Files)
  // ----------------------------------------------------
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayISO);
  const [selectedDay, setSelectedDay] = useState(() => getDayNameFromISO(getTodayISO()));
  const [startTime, setStartTime] = useState('01:00 PM');
  const [endTime, setEndTime] = useState('03:00 PM');
  const [activePreset, setActivePreset] = useState('01:00 PM - 03:00 PM');

  // Multi-file upload states for the top dropzone
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isDropzoneOver, setIsDropzoneOver] = useState(false);
  const batchFileInputRef = useRef(null);
  const activeBatchSectionRef = useRef(null);

  // Synchronize day name whenever date changes
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setSelectedDay(getDayNameFromISO(newDate));
  };

  const handleDaySelect = (dayName) => {
    setSelectedDay(dayName);
  };

  const handlePresetSelect = (preset) => {
    setActivePreset(preset.label);
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  // Raw and filtered batches
  const rawBatches = Array.isArray(surveillanceBatches) && surveillanceBatches.length > 0
    ? surveillanceBatches
    : INITIAL_HOURLY_SURVEILLANCE_BATCHES;

  // Filter batches for current store (or all if none match)
  const batches = useMemo(() => {
    const storeBatches = rawBatches.filter((b) => b?.customerId === selectedStoreId);
    return storeBatches.length > 0 ? storeBatches : rawBatches;
  }, [rawBatches, selectedStoreId]);

  // Active batch selection
  const [selectedBatchId, setSelectedBatchId] = useState(() => batches[0]?.id || 'cctv-batch-14');

  // Keep selectedBatchId valid when switching stores
  useEffect(() => {
    if (batches.length > 0 && !batches.some((b) => b.id === selectedBatchId)) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const activeBatch = batches.find((b) => b?.id === selectedBatchId) || batches[0] || null;

  // Active batch form text states
  const [assessmentText, setAssessmentText] = useState(activeBatch?.overallAssessment || '');
  const [actionsText, setActionsText] = useState(activeBatch?.actionsTaken || '');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceDragOver, setEvidenceDragOver] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '', subtitle: '', meta: null });
  const evidenceFileInputRef = useRef(null);

  // Sync text when switching batches
  useEffect(() => {
    if (activeBatch) {
      setAssessmentText(activeBatch.overallAssessment || '');
      setActionsText(activeBatch.actionsTaken || '');
    }
  }, [selectedBatchId, activeBatch]);

  // Handle file selection in top dropzone
  const handleBatchFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    const validImages = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      alert('Please select valid image files (JPEG, PNG, WebP).');
      return;
    }

    try {
      setIsProcessingBatch(true);
      const processedList = [];
      for (let i = 0; i < validImages.length; i++) {
        const file = validImages[i];
        const processed = await processImageFile(file, 1280, 960, 0.85);
        processedList.push(processed);
      }
      setSelectedFiles((prev) => [...prev, ...processedList]);
      showToast(`Added ${processedList.length} screenshot${processedList.length > 1 ? 's' : ''} to upload queue.`);
    } catch (err) {
      console.error('Batch upload error:', err);
      alert('Failed to process image files.');
    } finally {
      setIsProcessingBatch(false);
      if (batchFileInputRef.current) {
        batchFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ----------------------------------------------------
  // CREATE / SUBMIT NEW BATCH FROM UPLOAD SECTION
  // ----------------------------------------------------
  const handleCreateBatchFromUpload = () => {
    const timeLimitLabel = `${startTime} - ${endTime}`;
    const newBatchId = `cctv-batch-${Date.now()}`;

    // Standard cameras template for the store
    const storeCameras = INITIAL_CAMERAS.filter((c) => c.storeId === activeStore.id);
    const baseCameras = storeCameras.length >= 10 ? storeCameras : INITIAL_CAMERAS.slice(0, 10);

    // Generate snapshots with uploaded images applied or simulated
    const snapshots = baseCameras.map((cam, idx) => {
      const uploadedOverride = selectedFiles[idx];
      const isHighRisk = cam.isHighRisk || idx === 0 || idx === 1 || idx === 2;
      const isAnomaly = idx === 0; // Simulate 1 anomaly on Camera 1 (Register #1) like the user's screenshot!

      const aiConfidence = `${95 + Math.floor(Math.random() * 4)}%`;
      const humanCount = idx === 0 ? 2 : idx === 1 ? 1 : idx === 2 ? 0 : 1;

      let aiAnalysis = '';
      if (idx === 0) {
        aiAnalysis = 'Human detected: Authorized cashier and paying customer. Register drawer opened normally for change transaction.';
      } else if (idx === 1) {
        aiAnalysis = 'Human detected: Cashier scanning items. Cash drawer securely closed.';
      } else if (idx === 2) {
        aiAnalysis = 'Zero human presence in Safe Room. Safe lock mechanism engaged and secure.';
      } else {
        aiAnalysis = `Human detected: Standard operations in ${cam.zone}. No security anomalies detected.`;
      }

      return {
        id: `snap-${Date.now()}-${idx + 1}`,
        cameraId: cam.id || `CAM-${String(idx + 1).padStart(2, '0')}`,
        cameraName: cam.name || `Store Camera #${idx + 1}`,
        zone: cam.zone || 'Store Floor',
        isHighRisk,
        time: `${startTime.split(':')[0]}:${String(idx * 6 + 2).padStart(2, '0')}:14`,
        humanDetected: humanCount > 0,
        humanCount,
        aiStatus: isAnomaly ? 'OK' : 'OK', // In screenshot: AI Pre-Analysis is OK/NORMAL, human flagged suspicious
        aiConfidence,
        aiAnalysis,
        employeeVerification: isAnomaly ? 'Flagged Suspicious' : 'Verified OK',
        employeeNotes: isAnomaly
          ? 'Cashier badge active. Normal checkout flow.'
          : 'Standard register operation.',
        simulatedVisual: idx === 0 || idx === 1 ? 'register_cashier_customer' : 'normal',
        imageUrl: uploadedOverride ? uploadedOverride.dataUrl : null,
        imageMeta: uploadedOverride ? uploadedOverride : null,
      };
    });

    const newBatch = {
      id: newBatchId,
      customerId: activeStore.id,
      customerName: activeStore.companyName,
      employeeId: currentEmp.id,
      employeeName: currentEmp.name,
      date: selectedDate,
      dayOfWeek: selectedDay,
      hourSlot: timeLimitLabel,
      hour24: startTime.replace(/[^0-9:]/g, ''),
      timeRange: { start: startTime, end: endTime },
      status: 'Ready for Review',
      totalCameras: snapshots.length,
      flaggedSuspiciousCount: snapshots.filter((s) => s.employeeVerification === 'Flagged Suspicious').length,
      overallAssessment: `Periodic security check for ${activeStore.companyName} (${timeLimitLabel}). Cash counters and safe room checked.`,
      actionsTaken: 'Completed CCTV audit across all 10 cameras. Documented verification notes.',
      submittedAt: null,
      customerNotified: false,
      snapshots,
      evidenceImages: [],
    };

    if (addSurveillanceBatch) {
      addSurveillanceBatch(newBatch);
    }

    // Set as active batch and scroll to it
    setSelectedBatchId(newBatchId);
    setSelectedFiles([]);
    showToast(`Surveillance batch created for ${activeStore.companyName} (${timeLimitLabel})!`);

    // Smooth scroll to the audit box
    setTimeout(() => {
      activeBatchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Verification & snapshot updates
  const handleVerify = (bId, snapshotId, verifiedStatus, employeeNotes) => {
    if (updateSnapshotVerification) {
      updateSnapshotVerification(bId, snapshotId, verifiedStatus, employeeNotes);
    }
  };

  const handleSnapshotUpload = (bId, snapshotId, imageObj) => {
    if (uploadSnapshotImage) {
      uploadSnapshotImage(bId, snapshotId, imageObj);
    }
  };

  const handleSnapshotRemove = (bId, snapshotId) => {
    if (removeSnapshotImage) {
      removeSnapshotImage(bId, snapshotId);
    }
  };

  // Batch evidence upload
  const handleEvidenceFilesSelect = async (files) => {
    if (!files || files.length === 0 || !activeBatch?.id) return;
    try {
      setIsUploadingEvidence(true);
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const processedImages = [];
      for (const file of imageFiles) {
        const processed = await processImageFile(file, 1400, 1050, 0.85);
        processedImages.push(processed);
      }

      if (addBatchEvidenceImages) {
        addBatchEvidenceImages(activeBatch.id, processedImages);
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
    } finally {
      setIsUploadingEvidence(false);
      if (evidenceFileInputRef.current) {
        evidenceFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveEvidence = (index) => {
    if (activeBatch?.status === 'Submitted') return;
    if (window.confirm('Remove this evidence image?')) {
      if (removeBatchEvidenceImage && activeBatch?.id) {
        removeBatchEvidenceImage(activeBatch.id, index);
      }
    }
  };

  const handleOpenPreview = (imageInfo) => {
    setPreviewModal({
      isOpen: true,
      url: imageInfo.url,
      title: imageInfo.title || 'Image Preview',
      subtitle: imageInfo.subtitle || '',
      meta: imageInfo.meta || null,
    });
  };

  const handleSubmitBatch = (e) => {
    e.preventDefault();
    if (!activeBatch?.id) return;

    if (submitHourlySurveillanceBatch) {
      submitHourlySurveillanceBatch(
        activeBatch.id,
        assessmentText,
        actionsText,
        activeBatch.evidenceImages || []
      );
    }
  };

  const isSubmitted = activeBatch?.status === 'Submitted';
  const snapshots = activeBatch?.snapshots || [];
  const evidenceImages = Array.isArray(activeBatch?.evidenceImages) ? activeBatch.evidenceImages : [];
  const suspiciousCount = snapshots.filter((s) => s?.employeeVerification === 'Flagged Suspicious').length;
  const customUploadedSnapshotsCount = snapshots.filter((s) => Boolean(s?.imageUrl)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#245CE2] flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Hourly CCTV Surveillance & Human Detection Audit
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Periodic retail store security verification. Upload camera snapshots, specify audit time limits, verify AI human detection telemetry, and submit official security audits.
          </p>
        </div>

        {/* Store Selector Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-[#245CE2]" />
            Store:
          </span>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          >
            {storeList.map((store) => (
              <option key={store.id} value={store.id}>
                {store.companyName} ({store.storeCode || 'Store'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SCREENSHOT UPLOAD & BATCH CREATION SECTION (User Requirement)       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden transition-all">
        {/* Section Header Accordion Toggle */}
        <div
          onClick={() => setIsUploadPanelOpen((prev) => !prev)}
          className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 via-white to-slate-50/60 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#245CE2] text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Screenshot Upload & Surveillance Batch Generator
                <span className="bg-blue-100 text-[#245CE2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Step 1: Capture & Schedule
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set audit time limit, day & date, target retail store, and upload camera screenshots to generate audit batches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              {isUploadPanelOpen ? 'Collapse Upload Section' : 'Expand Upload Section'}
            </span>
            <button
              type="button"
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/60 transition-colors"
            >
              {isUploadPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Upload Form Content */}
        {isUploadPanelOpen && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Top Config Grid: 1. Timer / Time Window, 2. Date & Day, 3. Store Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Field 1: Time Window / Timer Selector */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#245CE2]" />
                    Audit Time Limit / Window
                  </label>
                  <span className="text-[10px] font-mono font-bold text-[#245CE2] bg-blue-100 px-2 py-0.5 rounded">
                    Timer
                  </span>
                </div>

                {/* Custom Start & End Time Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">From Time:</span>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setActivePreset('');
                      }}
                      placeholder="e.g. 01:00 PM"
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">To Time:</span>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setActivePreset('');
                      }}
                      placeholder="e.g. 03:00 PM"
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
                    />
                  </div>
                </div>

                {/* Preset Quick Selection Buttons */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">Quick Interval Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TIME_WINDOWS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-all border ${
                          activePreset === preset.label
                            ? 'bg-[#245CE2] text-white border-[#245CE2] shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Time Limit Display Badge */}
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-900 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#245CE2] flex-shrink-0" />
                  <span>
                    Upload Time Limit: <strong>{startTime} to {endTime}</strong>
                  </span>
                </div>
              </div>

              {/* Field 2: Date & Day Selector */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#245CE2]" />
                    Date & Day Selection
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {selectedDay}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">Select Audit Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
                  />
                </div>

                {/* Day selector pills */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">Select Day of Date:</span>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDaySelect(d)}
                        className={`text-[10px] py-1 rounded-md font-semibold transition-all border ${
                          selectedDay === d
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formatted Date & Day Confirmation */}
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    Day: <strong>{selectedDay}</strong> ({selectedDate})
                  </span>
                </div>
              </div>

              {/* Field 3: Retail Store Selection */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
                    Target Store Location
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    Batch Group
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">Store Destination:</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
                  >
                    {storeList.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Store ID:</span>
                    <span className="font-mono font-bold text-slate-700 text-[11px]">{activeStore.storeCode || 'STORE-104'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Monitored Cameras:</span>
                    <span className="font-bold text-[#245CE2] text-[11px]">10 Cameras (Zones A-G)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">High Risk Areas:</span>
                    <span className="font-bold text-rose-600 text-[10px]">Zone A (Registers) & Safe Room</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  Screenshots uploaded here will generate an isolated batch under <strong>{activeStore.companyName}</strong>.
                </p>
              </div>
            </div>

            {/* Field 4: Drag-and-Drop Screenshot Upload Dropzone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#245CE2]" />
                  Upload Camera Screenshots / CCTV Feeds
                </label>
                <span className="text-xs text-slate-400">
                  {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Select multiple images'}
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={batchFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleBatchFilesSelect(e.target.files)}
              />

              {/* Dropzone Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDropzoneOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDropzoneOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDropzoneOver(false);
                  if (e.dataTransfer.files) {
                    handleBatchFilesSelect(e.dataTransfer.files);
                  }
                }}
                onClick={() => batchFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                  isDropzoneOver
                    ? 'border-[#245CE2] bg-blue-50/80 text-[#245CE2]'
                    : 'border-slate-300 hover:border-[#245CE2] bg-slate-50/50 hover:bg-blue-50/20 text-slate-600'
                }`}
              >
                {isProcessingBatch ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#245CE2]" />
                    <span className="font-bold text-sm text-slate-800">Processing & compressing camera screenshots...</span>
                    <span className="text-xs text-slate-400">Optimizing resolution for AI telemetry analysis</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#245CE2] flex items-center justify-center mx-auto shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      Drag and drop CCTV screenshots here, or <span className="text-[#245CE2] underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 leading-normal">
                      Upload camera frames for <strong>{activeStore.companyName}</strong> between <strong>{startTime} to {endTime}</strong>.
                      Supports multiple JPEG, PNG, or WebP files.
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Files Gallery Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Queued Screenshots for this Batch ({selectedFiles.length}):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="relative group bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                      >
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-full h-20 object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="p-1.5 bg-slate-950 text-[10px] text-white flex items-center justify-between">
                          <span className="truncate max-w-[80px] font-mono">CAM-{String(idx + 1).padStart(2, '0')}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSelectedFile(idx);
                            }}
                            className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                            title="Remove file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span>Creating batch: </span>
                <strong className="text-slate-800">{activeStore.companyName}</strong> •{' '}
                <strong className="text-[#245CE2]">{startTime} - {endTime}</strong> •{' '}
                <strong className="text-emerald-700">{selectedDay}, {selectedDate}</strong>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {selectedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Clear Files
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCreateBatchFromUpload}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#245CE2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Analyze Surveillance Batch</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. STORE BATCHES SELECTOR TABS                                            */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Store Batches:
          </span>

          {batches.map((batch) => {
            const isSelected = batch.id === selectedBatchId;
            const hasSuspicious = (batch?.flaggedSuspiciousCount || 0) > 0;
            const batchImgCount = (batch?.snapshots?.filter((s) => Boolean(s?.imageUrl))?.length || 0) + (batch?.evidenceImages?.length || 0);

            return (
              <button
                key={batch.id}
                onClick={() => setSelectedBatchId(batch.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#245CE2] text-white shadow-sm ring-2 ring-blue-300/40'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{batch.hourSlot || 'Audit Batch'}</span>
                {batch.dayOfWeek && (
                  <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    ({batch.dayOfWeek.slice(0, 3)})
                  </span>
                )}
                {batchImgCount > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                    title={`${batchImgCount} custom image(s) uploaded`}
                  >
                    📷 {batchImgCount}
                  </span>
                )}
                {batch.status === 'Submitted' ? (
                  <span className={`w-2 h-2 rounded-full ${hasSuspicious ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {activeBatch && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Status:</span>
              <Badge status={activeBatch.status} />
            </div>
          )}
          {resetDemoData && (
            <button
              onClick={resetDemoData}
              title="Reset sample surveillance batches"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* If no batches are available */}
      {!activeBatch && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#245CE2] flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Batches Found for this Store</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the top upload panel to upload screenshots and create a new hourly audit batch, or reload demo data.
          </p>
          {resetDemoData && (
            <button
              onClick={resetDemoData}
              className="px-4 py-2 bg-[#245CE2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reload Demo Surveillance Batches
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ACTIVE BATCH DETAILS BOX (Matching User Screenshot Top Bar Exactly)    */}
      {/* ========================================================================= */}
      {activeBatch && (
        <div ref={activeBatchSectionRef} className="space-y-5">
          {/* 4-Metric Statistics Summary Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                HOUR WINDOW
              </span>
              <span className="font-bold text-slate-900 text-sm mt-1 block">
                {activeBatch.hourSlot || '02:00 PM'} {activeBatch.dayOfWeek ? `${activeBatch.dayOfWeek}` : 'Today'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                CAMERAS CAPTURED
              </span>
              <span className="font-bold text-[#245CE2] text-sm mt-1 block">
                {activeBatch.totalCameras || snapshots.length} Cameras Online
              </span>
            </div>

            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                PHOTOS & EVIDENCE
              </span>
              <span className="font-bold text-emerald-600 text-sm mt-1 block">
                {customUploadedSnapshotsCount + evidenceImages.length > 0
                  ? `${customUploadedSnapshotsCount + evidenceImages.length} Uploaded`
                  : '0 Uploaded'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                FLAGGED SUSPICIOUS
              </span>
              <span className={`font-bold text-sm mt-1 block ${suspiciousCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {suspiciousCount > 0 ? `${suspiciousCount} Anomaly Flagged` : '0 Anomalies (Clear)'}
              </span>
            </div>
          </div>

          {/* Subheader Banner (Matching User Screenshot Subheading) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#245CE2]" />
                Camera Snapshots for {activeBatch.hourSlot} ({snapshots.length} Feeds)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click "Upload" or drag-and-drop an image onto any camera card to replace the simulated CCTV feed with an operator-verified photo.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium self-start sm:self-auto">
              AI Human Detection Telemetry Enabled
            </span>
          </div>

          {/* ========================================================================= */}
          {/* 5. GRID OF CAMERA SNAPSHOT CARDS (Matching User Screenshot Cards)          */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {snapshots.map((snap) => (
              <CameraSnapshotCard
                key={snap.id}
                snapshot={snap}
                batchId={activeBatch.id}
                onVerify={handleVerify}
                onUploadImage={handleSnapshotUpload}
                onRemoveImage={handleSnapshotRemove}
                onPreviewImage={handleOpenPreview}
                isReadOnly={isSubmitted}
              />
            ))}
          </div>

          {/* ========================================================================= */}
          {/* 6. AUDIT EVIDENCE & SUBMIT SECTION                                        */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-subtle space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#245CE2]" />
                  Hourly Audit Evidence & Incident Photos
                  {evidenceImages.length > 0 && (
                    <span className="bg-blue-100 text-[#245CE2] text-xs font-bold px-2 py-0.5 rounded-full">
                      {evidenceImages.length} Attached
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Attach supporting CCTV screenshots, safe vault photos, suspect pictures, or store register receipts for the {activeBatch.hourSlot} audit report.
                </p>
              </div>

              {!isSubmitted && (
                <button
                  type="button"
                  onClick={() => evidenceFileInputRef.current?.click()}
                  disabled={isUploadingEvidence}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#245CE2] rounded-xl font-bold flex items-center gap-2 transition-all border border-blue-200 self-start sm:self-auto"
                >
                  {isUploadingEvidence ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add Evidence Images</span>
                </button>
              )}
            </div>

            {/* Hidden multi-file input */}
            <input
              ref={evidenceFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleEvidenceFilesSelect(e.target.files)}
            />

            {/* Evidence Gallery Grid */}
            {evidenceImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                {evidenceImages.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="group relative bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative h-28 w-full bg-slate-950 overflow-hidden">
                      <img
                        src={img.dataUrl || img}
                        alt={img.name || `Evidence ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenPreview({
                              url: img.dataUrl || img,
                              title: img.name || `Evidence Attachment #${idx + 1}`,
                              subtitle: `Batch ${activeBatch.hourSlot}`,
                              meta: img,
                            })
                          }
                          className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs transition-colors"
                          title="View full resolution"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidence(idx)}
                            className="p-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-lg backdrop-blur-xs transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2 bg-white flex items-center justify-between text-[11px] border-t border-slate-100">
                      <span className="font-semibold text-slate-800 truncate max-w-[100px]">
                        {img.name || `Photo #${idx + 1}`}
                      </span>
                      {img.size && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(img.size)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Assessment & Actions Form */}
            <form onSubmit={handleSubmitBatch} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                    Overall Security Assessment ({activeBatch.hourSlot}):
                  </label>
                  <textarea
                    rows={3}
                    disabled={isSubmitted}
                    value={assessmentText}
                    onChange={(e) => setAssessmentText(e.target.value)}
                    placeholder="Document general retail store security state, cash register traffic, safe room status..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                    Operational Actions Taken:
                  </label>
                  <textarea
                    rows={3}
                    disabled={isSubmitted}
                    value={actionsText}
                    onChange={(e) => setActionsText(e.target.value)}
                    placeholder="Actions executed: floor supervisor alerted via radio, drawer closed, customer assistance dispatched..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {isSubmitted ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Hourly audit report submitted on {new Date(activeBatch.submittedAt || Date.now()).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span>
                      Client Store Owner receives this complete audit report according to their notification settings.
                    </span>
                  )}
                </div>

                {!isSubmitted ? (
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#245CE2] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Hourly Surveillance Audit Report</span>
                  </button>
                ) : (
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Audit Complete & Dispatched
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Preview Modal */}
      {previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewModal({ isOpen: false, url: '', title: '', subtitle: '', meta: null })}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white bg-slate-950">
              <div>
                <h4 className="font-bold text-sm">{previewModal.title}</h4>
                {previewModal.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{previewModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal({ isOpen: false, url: '', title: '', subtitle: '', meta: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex items-center justify-center bg-black overflow-auto max-h-[75vh]">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            {previewModal.meta && (
              <div className="p-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
                <span>{previewModal.meta.name || 'Image'}</span>
                {previewModal.meta.size && (
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatFileSize(previewModal.meta.size)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
