import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import {
  Upload, Activity, AlertCircle, CheckCircle2, ShieldCheck, Brain,
  TrendingUp, RotateCcw, Zap, Heart, Droplets, Pill, FileDown,
  User, Calendar, UserCheck, Eye, HeartPulse, BookOpen, Stethoscope, Search, Bell, Baby
} from 'lucide-react';

import EyeAnatomy from './components/EyeAnatomy';

const MAX_FILE_SIZE_MB = 10;
const PROGRESS_STEPS = [
  "Reading Medical Report",
  "Extracting Biomarkers",
  "AI Analysis in Progress",
  "Generating Recommendations",
];

const isNormalStatus = (status) => {
  if (!status) return true;
  return status.trim().toLowerCase() === 'normal';
};

function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const chartsRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let progressInterval;
    if (loading && progress < 85 && !isSuccess) {
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const nextProgress = prev + Math.random() * 5;
          return nextProgress < 85 ? nextProgress : 85;
        });
      }, 500);
    } else if (isSuccess && progress < 100) {
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const nextProgress = prev + Math.random() * 5;
          return nextProgress < 100 ? nextProgress : 100;
        });
      }, 100);
    }
    return () => clearInterval(progressInterval);
  }, [loading, progress, isSuccess]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) {
      if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
      else if (e.type === 'dragleave') setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!loading) {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) uploadFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploadError(null);
    if (!file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setCurrentStep(0);
    setProgress(0);
    setIsSuccess(false);

    const stepInterval = setInterval(() => {
      setCurrentStep((prevStep) => {
        if (prevStep < PROGRESS_STEPS.length - 1) return prevStep + 1;
        clearInterval(stepInterval);
        return prevStep;
      });
    }, 2000);

    try {
      const res = await axios.post('http://localhost:8000/analyze', formData);
      clearInterval(stepInterval);
      setCurrentStep(PROGRESS_STEPS.length - 1);
      setIsSuccess(true);
      setProgress(100);
      setTimeout(() => {
        setData(res.data);
        setLoading(false);
        setIsSuccess(false);
      }, 1200);
    } catch (err) {
      console.error("Upload error:", err);
      clearInterval(stepInterval);
      const detail = err.response?.data?.detail;
      const detailStr = Array.isArray(detail) ? JSON.stringify(detail) : String(detail || "");
      const msg = err.message || "";

      if (
        detailStr.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("quota")
      ) {
        setUploadError("Gemini API quota exceeded. Please wait a few minutes or use a new API key.");
      } else {
        setUploadError(typeof detail === "string" ? detail : "Error analyzing report. Please try again.");
      }
      setLoading(false);
      setProgress(0);
      setCurrentStep(0);
      setIsSuccess(false);
    }
  };

  const resetAnalysis = () => {
    setData(null);
    setLoading(false);
    setDragActive(false);
    setUploadError(null);
    setProgress(0);
    setCurrentStep(0);
    setIsSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadReport = async () => {
    if (!data) return;
    setIsDownloading(true);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 0;

    doc.setFillColor(0, 99, 242);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MediScan AI – Medical Report', W / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 20, { align: 'center' });
    y = 34;

    if (data.patient_info) {
      const pi = data.patient_info;
      doc.setFillColor(244, 246, 248);
      doc.roundedRect(10, y, W - 20, 28, 3, 3, 'F');
      doc.setTextColor(2, 2, 2);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Information', 15, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const col1 = [`Name: ${pi.name || 'N/A'}`, `Age: ${pi.age || 'N/A'}`, `Gender: ${pi.gender || 'N/A'}`];
      const col2 = [`Patient ID: ${pi.patient_id || 'N/A'}`, `Doctor: ${pi.doctor_name || 'N/A'}`, `Date: ${pi.report_date || 'N/A'}`];
      col1.forEach((t, i) => doc.text(t, 15, y + 14 + i * 5));
      col2.forEach((t, i) => doc.text(t, W / 2 + 5, y + 14 + i * 5));
      y += 34;
    }

    const score = data.health_score || 0;
    const scoreColor = score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...scoreColor);
    doc.roundedRect(10, y, W - 20, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Overall Health Score: ${score}/100`, W / 2, y + 10, { align: 'center' });
    y += 22;

    if (data.summary) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
      doc.setTextColor(2, 2, 2);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 15, y + 5.5);
      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const summaryLines = doc.splitTextToSize(data.summary, W - 24);
      summaryLines.forEach((line) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(line, 14, y);
        y += 5;
      });
      y += 4;
    }

    // Embed Charts
    if (chartsRef.current && data.report_type === 'blood_test') {
      try {
        const canvas = await html2canvas(chartsRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = W - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (y + pdfHeight > 270) {
            doc.addPage();
            y = 15;
        }
        
        doc.addImage(imgData, 'PNG', 10, y, pdfWidth, pdfHeight);
        y += pdfHeight + 10;
      } catch (err) {
        console.error("Failed to capture charts for PDF", err);
      }
    }

    if (data.report_type === 'blood_test' && Array.isArray(data.biomarkers) && data.biomarkers.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(2, 2, 2);
      doc.text('Biomarker Results', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Biomarker', 'Value', 'Unit', 'Reference Range', 'Status']],
        body: data.biomarkers.map((bm) => [
          bm.name || '',
          String(bm.value ?? ''),
          bm.unit || '',
          bm.reference_range || '',
          bm.status || '',
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 99, 242], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell(hookData) {
          if (hookData.column.index === 4 && hookData.section === 'body') {
            const st = (hookData.cell.raw || '').toLowerCase();
            if (st === 'normal') hookData.cell.styles.textColor = [22, 163, 74];
            else if (st === 'high' || st === 'abnormal') hookData.cell.styles.textColor = [239, 68, 68];
            else if (st === 'low') hookData.cell.styles.textColor = [217, 119, 6];
          }
        },
        margin: { left: 10, right: 10 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (data.report_type === 'eye_report') {
      const eyeData = [
        ['Visual Acuity (Right)', data.visual_acuity_right || 'N/A'],
        ['Visual Acuity (Left)', data.visual_acuity_left || 'N/A'],
        ['Intraocular Pressure', data.intraocular_pressure || 'N/A'],
      ];
      if (y > 240) { doc.addPage(); y = 15; }
      autoTable(doc, {
        startY: y,
        head: [['Measurement', 'Result']],
        body: eyeData,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 99, 242], textColor: 255, fontStyle: 'bold' },
        margin: { left: 10, right: 10 },
      });
      y = doc.lastAutoTable.finalY + 6;

      if (Array.isArray(data.findings) && data.findings.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Key Findings:', 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        data.findings.forEach((f) => {
          doc.text(`• ${f}`, 16, y);
          y += 5;
        });
        y += 2;
      }
    }

    if (data.report_type === 'ecg_heart') {
      const ecgData = [
        ['Heart Rate', data.heart_rate ? `${data.heart_rate} bpm` : 'N/A'],
        ['Rhythm Type', data.rhythm_type || 'N/A'],
        ['PR Interval', data.pr_interval || 'N/A'],
        ['QTc Interval', data.qtc_interval || 'N/A'],
      ];
      if (y > 240) { doc.addPage(); y = 15; }
      autoTable(doc, {
        startY: y,
        head: [['Measurement', 'Result']],
        body: ecgData,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 99, 242], textColor: 255, fontStyle: 'bold' },
        margin: { left: 10, right: 10 },
      });
      y = doc.lastAutoTable.finalY + 6;

      if (Array.isArray(data.abnormalities) && data.abnormalities.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Abnormalities:', 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        data.abnormalities.forEach((a) => {
          doc.text(`• ${a}`, 16, y);
          y += 5;
        });
        y += 2;
      }
    }

    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFillColor(0, 99, 242);
      doc.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Recommendations', 15, y + 5.5);
      y += 11;
      doc.setTextColor(2, 2, 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      data.recommendations.forEach((rec, i) => {
        if (y > 270) { doc.addPage(); y = 15; }
        const lines = doc.splitTextToSize(`${i + 1}. ${rec}`, W - 24);
        lines.forEach((line) => { doc.text(line, 14, y); y += 5; });
        y += 1;
      });
    }

    if (Array.isArray(data.disease_explanations) && data.disease_explanations.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFillColor(2, 2, 2);
      doc.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Medical Terms Explained', 15, y + 5.5);
      y += 11;
      doc.setTextColor(2, 2, 2);
      data.disease_explanations.forEach((exp) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(exp.disease_name || '', 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(exp.simple_explanation || '', W - 24);
        lines.forEach((line) => {
          if (y > 270) { doc.addPage(); y = 15; }
          doc.text(line, 16, y);
          y += 4.5;
        });
        y += 3;
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(2, 2, 2);
      doc.rect(0, 285, W, 12, 'F');
      doc.setTextColor(184, 184, 184);
      doc.setFontSize(7);
      doc.text('MediScan AI — For informational purposes only.', W / 2, 291, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, W - 12, 291, { align: 'right' });
    }

    doc.save(`MediScan_Report_${data.patient_info?.name || 'Patient'}.pdf`);
    setIsDownloading(false);
  };

  const abnormalBiomarkers = data?.biomarkers?.filter((bm) => !isNormalStatus(bm.status)) || [];
  const normalBiomarkers = data?.biomarkers?.filter((bm) => isNormalStatus(bm.status)) || [];

  // Build bar chart data: show ALL biomarkers, normalise value to a 0-100 % within their reference range
  const fullBarData = (data?.biomarkers || []).map(bm => {
    const val = parseFloat(bm.value);
    // Try to parse ref range like "13.5-17.5" or "< 200" etc.
    let pct = 0;
    if (!isNaN(val) && bm.reference_range) {
      const rangeParts = bm.reference_range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (rangeParts) {
        const lo = parseFloat(rangeParts[1]);
        const hi = parseFloat(rangeParts[2]);
        const mid = (lo + hi) / 2;
        // center-normalise: 100 = exactly at midpoint, scale so edges of range ~= 50/150
        pct = Math.min(200, Math.max(0, (val / mid) * 100));
      } else {
        // fallback: just use raw value capped at 100
        pct = Math.min(100, Math.max(0, val));
      }
    }
    return {
      name: bm.name,
      pct: parseFloat(pct.toFixed(1)),
      rawValue: bm.value,
      unit: bm.unit,
      refRange: bm.reference_range,
      status: bm.status,
      isNormal: isNormalStatus(bm.status),
    };
  });

  const renderPatientInfo = () => {
    if (!data?.patient_info) return null;
    const pi = data.patient_info;
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-base font-bold text-[#020202] mb-3 flex items-center gap-2">
          <User className="text-[#0063F2]" size={18} /> Patient Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
          {[
            { label: 'Name', val: pi.name },
            { label: 'Age', val: pi.age },
            { label: 'Gender', val: pi.gender },
            { label: 'Patient ID', val: pi.patient_id },
            { label: 'Doctor', val: pi.doctor_name },
            { label: 'Date', val: pi.report_date },
          ].map(({ label, val }) => (
            val ? (
              <div key={label}>
                <p className="text-[10px] text-[#B8B8B8] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-[#020202]">{val}</p>
              </div>
            ) : null
          ))}
        </div>
      </div>
    );
  };

  const renderDiseaseDictionary = () => {
    if (!Array.isArray(data?.disease_explanations) || data.disease_explanations.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-base font-bold text-[#020202] mb-3 flex items-center gap-2">
          <BookOpen className="text-[#0063F2]" size={18} /> Medical Terms
        </h3>
        <div className="space-y-2">
          {data.disease_explanations.map((exp, i) => (
            <div key={i} className="bg-[#f4f6f8] rounded-xl p-3">
              <h4 className="text-xs font-bold text-[#020202] mb-1">{exp.disease_name}</h4>
              <p className="text-[#020202]/80 leading-relaxed text-[11px]">{exp.simple_explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBloodReport = () => {
    const score = data.health_score || 0;
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
    return (
      <div className="space-y-5">

        {/* ── 1. OVERALL HEALTH SCORE BANNER ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="text-green-500" size={20} />
              <div>
                <h2 className="text-base font-bold text-gray-800">Overall Health Score</h2>
                <p className="text-[11px] text-gray-400">Based on your latest medical report</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black" style={{ color: scoreColor }}>{score}</span>
              <span className="text-sm text-gray-400 ml-1">out of 100</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </div>
          {data.summary && (
            <p className="text-[12px] text-gray-500 leading-relaxed mt-4 border-t border-gray-100 pt-4">
              {data.summary}
            </p>
          )}
        </div>

        {/* ── 2. MAIN GRID: CHART (left) + SIDEBAR (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Full-width Bar Chart + Biomarker Cards ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Biomarker Visualisation */}
            <div ref={chartsRef} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="text-green-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800">Biomarker Visualization</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">
                Bar shows the value as % of the reference range midpoint. 100% = exact centre.
              </p>

              {fullBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fullBarData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 200]}
                      ticks={[0, 50, 100, 150, 200]}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={(val, name, props) => [
                        `${props.payload.rawValue} ${props.payload.unit} (${val}% of midpoint)`,
                        props.payload.name
                      ]}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {fullBarData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isNormal ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-400">No biomarker data</p>
              )}

              {/* Legend */}
              <div className="flex items-center gap-6 mt-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-[11px] font-semibold text-gray-500">
                    Normal Range &nbsp;
                    <span className="font-bold text-gray-700">{normalBiomarkers.length} values</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-[11px] font-semibold text-gray-500">
                    Abnormal &nbsp;
                    <span className="font-bold text-red-600">{abnormalBiomarkers.length} values</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Biomarker Summary Cards */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-green-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800">Biomarker Summary</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.biomarkers?.map((bm, i) => {
                  const normal = isNormalStatus(bm.status);
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border ${
                        normal
                          ? 'border-gray-100 bg-white'
                          : 'border-red-100 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-700">{bm.name}</span>
                        {normal ? (
                          <CheckCircle2 className="text-green-500 flex-shrink-0" size={16} />
                        ) : (
                          <AlertCircle className="text-red-500 flex-shrink-0" size={16} />
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className={`text-2xl font-black ${
                          normal ? 'text-gray-800' : 'text-red-600'
                        }`}>{bm.value}</span>
                        <span className="text-[11px] text-gray-400 font-semibold">{bm.unit}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium mb-2">
                        Reference: {bm.reference_range}
                      </p>
                      <div className="border-t border-gray-100 pt-2">
                        <p className={`text-[11px] leading-relaxed ${
                          normal ? 'text-gray-500' : 'text-red-500'
                        }`}>
                          {normal
                            ? `Your ${bm.name} is within the normal range.`
                            : `Your ${bm.name} is ${bm.status?.toLowerCase() || 'out of range'} — consult your physician.`
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-4">

            {/* AI Recommendations */}
            <div className="bg-[#1a237e] text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-blue-300" />
                <h3 className="text-sm font-bold">AI Recommendations</h3>
              </div>
              <ul className="space-y-3">
                {(data.recommendations || []).map((rec, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-[11px] text-blue-100 leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-[#0063F2] text-white flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stat counter cards */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Biomarkers</p>
              <p className="text-3xl font-black text-gray-800">{data.biomarkers?.length || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Normal Values</p>
              <p className="text-3xl font-black text-gray-800">{normalBiomarkers.length}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${
              abnormalBiomarkers.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                abnormalBiomarkers.length > 0 ? 'text-red-400' : 'text-gray-400'
              }`}>Abnormal Values</p>
              <p className={`text-3xl font-black ${
                abnormalBiomarkers.length > 0 ? 'text-red-600' : 'text-gray-800'
              }`}>{abnormalBiomarkers.length}</p>
            </div>

            {/* Medical Terms */}
            {renderDiseaseDictionary()}
          </div>
        </div>
      </div>
    );
  };

  const renderEyeReport = () => {
    const score = data.health_score || 0;
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

    // Build bar chart from eye_metrics if available, else build from VA + IOP fallback
    const eyeBarData = (data.eye_metrics && data.eye_metrics.length > 0)
      ? data.eye_metrics.map(m => {
          const rangeParts = (m.reference_range || '').match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
          let pct = 50;
          if (rangeParts) {
            const lo = parseFloat(rangeParts[1]);
            const hi = parseFloat(rangeParts[2]);
            const mid = (lo + hi) / 2;
            if (mid !== 0) pct = Math.min(200, Math.max(0, (m.value / mid) * 100));
          }
          return {
            name: m.metric,
            pct: parseFloat(pct.toFixed(1)),
            rawValue: m.value,
            unit: m.unit || '',
            refRange: m.reference_range || '',
            isNormal: (m.status || '').toLowerCase() === 'normal',
          };
        })
      : [];

    const eyeAbnormal = (data.eye_metrics || []).filter(m => (m.status || '').toLowerCase() !== 'normal');
    const eyeNormal = (data.eye_metrics || []).filter(m => (m.status || '').toLowerCase() === 'normal');

    const urgencyColor = { Urgent: 'text-red-600 bg-red-50 border-red-200', Soon: 'text-orange-600 bg-orange-50 border-orange-200', Routine: 'text-green-600 bg-green-50 border-green-200' };

    return (
      <div className="space-y-5">

        {/* ── 1. HEALTH SCORE BANNER ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="text-green-500" size={20} />
              <div>
                <h2 className="text-base font-bold text-gray-800">Overall Vision Score</h2>
                <p className="text-[11px] text-gray-400">Based on your latest eye examination</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end">
                <div>
                  <span className="text-4xl font-black" style={{ color: scoreColor }}>{score}</span>
                  <span className="text-sm text-gray-400 ml-1">out of 100</span>
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    score >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
                    score >= 60 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                    'text-red-600 bg-red-50 border-red-200'
                  }`}>
                    {score >= 80 ? 'Low Risk' : score >= 60 ? 'Moderate Risk' : 'High Risk'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </div>
          {data.summary && (
            <p className="text-[12px] text-gray-500 leading-relaxed mt-4 border-t border-gray-100 pt-4">{data.summary}</p>
          )}
        </div>

        {/* Patient Info */}
        {renderPatientInfo()}

        {/* ── 1.5. VISION SUMMARY BOX ── */}
        {data.vision_summary && data.vision_summary.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="text-blue-500" size={18} /> Easy-to-Understand Vision Summary
            </h3>
            <div className="space-y-2">
              {data.vision_summary.map((point, idx) => {
                const isWarning = point.includes('⚠');
                const isCheck = point.includes('✓') || point.includes('✔');
                
                let icon = <span className="text-gray-400">•</span>;
                let textClass = "text-gray-700";
                
                if (isWarning) {
                  icon = <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={14} />;
                  textClass = "text-orange-800 font-medium";
                } else if (isCheck) {
                  icon = <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={14} />;
                  textClass = "text-gray-700";
                }
                
                const cleanText = point.replace(/[⚠✓✔]/g, '').trim();

                return (
                  <div key={idx} className="flex items-start gap-2">
                    {icon}
                    <p className={`text-[12px] leading-relaxed ${textClass}`}>{cleanText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 2. QUICK STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Vis. Acuity (Right)</p>
            <p className="text-xl font-black text-gray-800">{data.visual_acuity_right || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Vis. Acuity (Left)</p>
            <p className="text-xl font-black text-gray-800">{data.visual_acuity_left || 'N/A'}</p>
          </div>
          <div className={`rounded-2xl p-4 border shadow-sm ${eyeAbnormal.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-400">Intraocular Pressure</p>
            <p className={`text-lg font-black leading-tight ${eyeAbnormal.some(m => m.metric?.toLowerCase().includes('iop')) ? 'text-red-600' : 'text-gray-800'}`}>
              {data.intraocular_pressure || 'N/A'}
            </p>
          </div>
          {data.corneal_thickness && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Corneal Thickness</p>
              <p className="text-lg font-black text-gray-800">{data.corneal_thickness}</p>
            </div>
          )}
          {data.tear_film_breakup_time && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TBUT</p>
              <p className="text-lg font-black text-gray-800">{data.tear_film_breakup_time}</p>
            </div>
          )}
          {data.cup_to_disc_ratio && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">C/D Ratio</p>
              <p className="text-lg font-black text-gray-800">{data.cup_to_disc_ratio}</p>
            </div>
          )}
        </div>

        {/* ── 3. MAIN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT COL: Chart + Findings + Condition Cards */}
          <div className="lg:col-span-2 space-y-5">

            {/* Eye Anatomy Visualizer */}
            {data.anatomy_issues && data.anatomy_issues.length > 0 && (
              <EyeAnatomy anatomyIssues={data.anatomy_issues} />
            )}

            {/* Bar Chart for Eye Metrics */}
            {eyeBarData.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="text-green-500" size={18} />
                  <h3 className="text-sm font-bold text-gray-800">Eye Metrics Visualization</h3>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">
                  Bar shows value as % of reference range midpoint. 100% = centre of normal range.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={eyeBarData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} angle={-40} textAnchor="end" height={65} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 200]} ticks={[0, 50, 100, 150, 200]} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={(val, name, props) => [`${props.payload.rawValue} ${props.payload.unit} (${val}% of midpoint)`, props.payload.name]}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {eyeBarData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isNormal ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-[11px] font-semibold text-gray-500">Normal &nbsp;<span className="font-bold text-gray-700">{eyeNormal.length} metrics</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-[11px] font-semibold text-gray-500">Abnormal &nbsp;<span className="font-bold text-red-600">{eyeAbnormal.length} metrics</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Eyeglass Prescription */}
            {data.prescription && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Eye className="text-blue-500" size={18} /> Eyeglass Prescription
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Right Eye */}
                  <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-3">Right Eye (OD)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">SPH</p>
                        <p className="font-bold text-gray-800">{data.prescription.sph_right || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">CYL</p>
                        <p className="font-bold text-gray-800">{data.prescription.cyl_right || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">AXIS</p>
                        <p className="font-bold text-gray-800">{data.prescription.axis_right ? `${data.prescription.axis_right}°` : '—'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Left Eye */}
                  <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-3">Left Eye (OS)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">SPH</p>
                        <p className="font-bold text-gray-800">{data.prescription.sph_left || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">CYL</p>
                        <p className="font-bold text-gray-800">{data.prescription.cyl_left || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">AXIS</p>
                        <p className="font-bold text-gray-800">{data.prescription.axis_left ? `${data.prescription.axis_left}°` : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Findings */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Search className="text-green-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800">Key Findings</h3>
              </div>
              <ul className="space-y-3">
                {(data.findings || []).map((f, i) => {
                  const isAbnormal = /abnormal|elevated|high|low|reduced|myopia|astigmatism|dry|nicking|borderline/i.test(f);
                  return (
                    <li key={i} className={`flex items-start gap-3 text-sm p-3 rounded-xl ${isAbnormal ? 'bg-red-50' : 'bg-green-50'}`}>
                      {isAbnormal
                        ? <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={15} />
                        : <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={15} />}
                      <span className={`leading-relaxed font-medium ${isAbnormal ? 'text-red-700' : 'text-green-700'}`}>{f}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Condition Cards — deep explanations */}
            {Array.isArray(data.disease_explanations) && data.disease_explanations.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="text-green-500" size={18} />
                  <h3 className="text-sm font-bold text-gray-800">Conditions Explained</h3>
                </div>
                <div className="space-y-4">
                  {data.disease_explanations.map((exp, i) => {
                    const urgency = exp.urgency || 'Routine';
                    const urgBadge = urgencyColor[urgency] || urgencyColor['Routine'];
                    const sevStr = (exp.severity || '').toLowerCase();
                    const isAbnormal = (exp.status || '').toLowerCase() === 'abnormal';
                    
                    let cardStyle = 'border-gray-100 bg-white';
                    let icon = <CheckCircle2 className="text-green-500" size={16} />;
                    let titleStyle = 'text-gray-800';
                    let sevBadge = 'text-gray-700 bg-gray-100 border-gray-200';
                    
                    if (sevStr.includes('mild')) {
                        cardStyle = 'border-green-100 bg-green-50/40';
                        icon = <AlertCircle className="text-green-600" size={16} />;
                        titleStyle = 'text-green-800';
                        sevBadge = 'text-green-700 bg-green-100 border-green-200';
                    } else if (sevStr.includes('moderate') || sevStr.includes('borderline')) {
                        cardStyle = 'border-orange-100 bg-orange-50/40';
                        icon = <AlertCircle className="text-orange-500" size={16} />;
                        titleStyle = 'text-orange-800';
                        sevBadge = 'text-orange-700 bg-orange-100 border-orange-200';
                    } else if (sevStr.includes('severe') || isAbnormal) {
                        cardStyle = 'border-red-100 bg-red-50/40';
                        icon = <AlertCircle className="text-red-500" size={16} />;
                        titleStyle = 'text-red-700';
                        sevBadge = 'text-red-700 bg-red-100 border-red-200';
                    }

                    return (
                      <div key={i} className={`rounded-2xl border p-5 ${cardStyle}`}>
                        {/* Header row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {icon}
                            <h4 className={`text-sm font-bold ${titleStyle}`}>{exp.disease_name}</h4>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {exp.severity && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${sevBadge}`}>{exp.severity}</span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgBadge}`}>{urgency}</span>
                          </div>
                        </div>

                        {/* Simplified Explanation blocks */}
                        <div className="space-y-3 mb-3">
                          {(exp.simple_explanation || '').split(/\n\n/).map((section, idx) => {
                            const lines = section.split(/\n/);
                            if (lines.length < 2) return <p key={idx} className="text-[12px] text-gray-700 leading-relaxed">{section}</p>;
                            const header = lines[0];
                            const content = lines.slice(1).join(' ');
                            return (
                              <div key={idx}>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{header}</p>
                                <p className="text-[12px] text-gray-800 leading-relaxed font-medium">{content}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">
            {/* AI Recommendations */}
            <div className="bg-[#1a237e] text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-blue-300" />
                <h3 className="text-sm font-bold">AI Recommendations</h3>
              </div>
              <ul className="space-y-3">
                {(data.recommendations || []).map((rec, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-[11px] text-blue-100 leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-[#0063F2] text-white flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">{i + 1}</div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-Up Timeline */}
            {data.follow_up_timeline && data.follow_up_timeline.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="text-orange-500" size={18} />
                  <h3 className="text-sm font-bold text-gray-800">Recommended Follow-Up</h3>
                </div>
                <div className="space-y-3">
                  {data.follow_up_timeline.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <p className="text-[11px] font-bold text-gray-800">{item.condition}</p>
                      <p className="text-[10px] text-orange-600 font-bold uppercase">{item.timeline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Metrics</p>
              <p className="text-3xl font-black text-gray-800">{(data.eye_metrics || []).length || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Normal Metrics</p>
              <p className="text-3xl font-black text-gray-800">{eyeNormal.length || '—'}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${eyeAbnormal.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${eyeAbnormal.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>Abnormal Metrics</p>
              <p className={`text-3xl font-black ${eyeAbnormal.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{eyeAbnormal.length || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderECGReport = () => {
    const score = data.health_score || 0;
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

    const ecgMetrics = data.ecg_metrics || [];
    const ecgAbnormal = ecgMetrics.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s !== 'normal' && s !== 'borderline';
    });
    const ecgNormal   = ecgMetrics.filter(m => (m.status || '').toLowerCase() === 'normal');
    const ecgBorderline = ecgMetrics.filter(m => (m.status || '').toLowerCase() === 'borderline');

    // Build bar chart data from ecg_metrics
    const ecgBarData = ecgMetrics.map(m => {
      const rangeParts = (m.reference_range || '').match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      let pct = 100;
      if (rangeParts) {
        const lo  = parseFloat(rangeParts[1]);
        const hi  = parseFloat(rangeParts[2]);
        const mid = (lo + hi) / 2;
        if (mid !== 0) pct = Math.min(200, Math.max(0, (m.value / mid) * 100));
      }
      return {
        name: m.metric,
        pct: parseFloat(pct.toFixed(1)),
        rawValue: m.value,
        unit: m.unit || '',
        refRange: m.reference_range || '',
        isNormal: (m.status || '').toLowerCase() === 'normal',
        isBorderline: (m.status || '').toLowerCase() === 'borderline' || (m.status || '').toLowerCase().includes('borderline'),
      };
    });

    // ── Synthetic PQRST waveform ──────────────────────────────────────────
    // We plot one cardiac cycle (0–800 ms) as ~60 data points.
    // Normal reference values: HR 75, PR 160 ms, QRS 90 ms, QT 380 ms.
    // Patient values shift the intervals proportionally.
    const patientHR  = data.heart_rate  || 75;
    const patientPR  = parseFloat((data.pr_interval  || '160').replace(/[^0-9.]/g, '')) || 160;
    const patientQRS = ecgMetrics.find(m => m.metric === 'QRS Duration')?.value || 90;
    const patientQTc = parseFloat((data.qtc_interval || '400').replace(/[^0-9.]/g, '')) || 400;

    const buildPQRST = (hr, pr, qrs, qt, scale = 1.0) => {
      const cycleMs = Math.round(60000 / Math.max(hr, 30));
      const pts = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * cycleMs;
        let v = 0;
        // P wave  (small bump around pr - 80 to pr)
        const pStart = pr - 80, pEnd = pr;
        if (t >= pStart && t <= pEnd) {
          const x = (t - pStart) / (pEnd - pStart);
          v = scale * 0.15 * Math.sin(Math.PI * x);
        }
        // QRS complex
        const qStart = pr, rPeak = pr + qrs * 0.4, sEnd = pr + qrs;
        if (t >= qStart && t <= sEnd) {
          const x = (t - qStart) / (sEnd - qStart);
          if (x < 0.2)       v = scale * -0.1 * (x / 0.2);
          else if (x < 0.45) v = scale *  1.0 * ((x - 0.2) / 0.25);
          else if (x < 0.55) v = scale *  1.0 - scale * 1.4 * ((x - 0.45) / 0.1);
          else               v = scale * -0.4 * (1 - (x - 0.55) / 0.45);
        }
        // T wave (smooth bump from sEnd to sEnd + qt*0.4)
        const tStart = sEnd + 40, tEnd = sEnd + qt * 0.35;
        if (t >= tStart && t <= tEnd) {
          const x = (t - tStart) / (tEnd - tStart);
          v = scale * 0.3 * Math.sin(Math.PI * x);
        }
        pts.push({ t: Math.round(t), v: parseFloat(v.toFixed(3)) });
      }
      return pts;
    };

    const normalWave  = buildPQRST(75,   160, 90,  380, 1.0);
    const patientWave = buildPQRST(patientHR, patientPR, patientQRS, patientQTc, 1.0);

    // Merge into one array for Recharts dual-line chart
    const waveData = normalWave.map((pt, i) => ({
      t: pt.t,
      normal:  pt.v,
      patient: patientWave[i]?.v ?? 0,
    }));

    const urgencyColor = {
      Urgent:  'text-red-600 bg-red-50 border-red-200',
      Soon:    'text-orange-600 bg-orange-50 border-orange-200',
      Routine: 'text-green-600 bg-green-50 border-green-200',
    };

    return (
      <div className="space-y-5">

        {/* ── 1. HEALTH SCORE BANNER ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="text-red-500" size={20} />
              <div>
                <h2 className="text-base font-bold text-gray-800">Overall Heart Score</h2>
                <p className="text-[11px] text-gray-400">Based on your latest ECG / Electrocardiogram</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end">
                <div>
                  <span className="text-4xl font-black" style={{ color: scoreColor }}>{score}</span>
                  <span className="text-sm text-gray-400 ml-1">out of 100</span>
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    score >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
                    score >= 60 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                    'text-red-600 bg-red-50 border-red-200'
                  }`}>
                    {score >= 80 ? 'Low Risk' : score >= 60 ? 'Moderate Risk' : 'High Risk'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </div>
          {data.summary && (
            <p className="text-[12px] text-gray-500 leading-relaxed mt-4 border-t border-gray-100 pt-4">{data.summary}</p>
          )}
        </div>

        {/* ── 2. QUICK STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Heart Rate',   val: data.heart_rate  ? `${data.heart_rate} bpm` : 'N/A', highlight: data.heart_rate && (data.heart_rate < 60 || data.heart_rate > 100) },
            { label: 'Rhythm Type',  val: data.rhythm_type || 'N/A', highlight: false },
            { label: 'PR Interval',  val: data.pr_interval  || 'N/A', highlight: ecgAbnormal.some(m => m.metric === 'PR Interval') },
            { label: 'QTc Interval', val: data.qtc_interval || 'N/A', highlight: ecgAbnormal.some(m => m.metric === 'QTc Interval') },
          ].map(({ label, val, highlight }) => (
            <div key={label} className={`rounded-2xl p-4 border shadow-sm ${ highlight ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100' }`}>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-lg font-black leading-tight ${ highlight ? 'text-red-600' : 'text-gray-800' }`}>{val}</p>
            </div>
          ))}
        </div>

        {/* ── 3. MAIN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT COL */}
          <div className="lg:col-span-2 space-y-5">

            <div ref={chartsRef} className="space-y-5">
              {/* ECG Waveform Comparison */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                <Activity className="text-red-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800">ECG Waveform — Normal vs. Patient</h3>
              </div>
              <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-md inline-flex items-center gap-2 mb-3 mt-1 border border-orange-100">
                <AlertCircle size={14} className="text-orange-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider">⚠ AI Generated Visualization — Not Actual ECG Strip</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">
                Synthetic PQRST waveform based on your extracted values. Gray = standard normal reference. Red = your ECG profile.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={waveData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => `${v}ms`} axisLine={false} tickLine={false} interval={15} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}mV`} domain={[-0.6, 1.2]} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    formatter={(val, name) => [`${val} mV`, name === 'normal' ? 'Normal Reference' : 'Your ECG']}
                  />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="normal"  stroke="#d1d5db" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="normal" />
                  <Line type="monotone" dataKey="patient" stroke="#ef4444"  strokeWidth={2}   dot={false} name="patient" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-6 mt-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-300" style={{ borderTop: '2px dashed #d1d5db' }} />
                  <span className="text-[11px] text-gray-500 font-semibold">Normal Reference (75 bpm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-red-500" />
                  <span className="text-[11px] text-gray-500 font-semibold">Your ECG ({patientHR} bpm)</span>
                </div>
              </div>
            </div>

            {/* ECG Metrics Bar Chart */}
            {ecgBarData.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="text-green-500" size={18} />
                  <h3 className="text-sm font-bold text-gray-800">ECG Metrics Visualization</h3>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">
                  Bar shows value as % of reference range midpoint. 100% = centre of normal range.
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ecgBarData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} angle={-40} textAnchor="end" height={65} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 200]} ticks={[0, 50, 100, 150, 200]} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={(val, name, props) => [`${props.payload.rawValue} ${props.payload.unit} (${val}% of midpoint)`, props.payload.name]}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {ecgBarData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isNormal ? '#22c55e' : (entry.isBorderline ? '#f97316' : '#ef4444')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-gray-400 text-center mt-2 mb-1 font-medium italic">
                  * 100% = Center of Normal Range. Values outside reference range are highlighted.
                </div>
                <div className="flex items-center gap-6 mt-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-[11px] font-semibold text-gray-500">Normal &nbsp;<span className="font-bold text-gray-700">{ecgNormal.length} metrics</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-orange-500" />
                    <span className="text-[11px] font-semibold text-gray-500">Borderline &nbsp;<span className="font-bold text-orange-600">{ecgBorderline.length} metrics</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-[11px] font-semibold text-gray-500">Abnormal &nbsp;<span className="font-bold text-red-600">{ecgAbnormal.length} metrics</span></span>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Patient Info */}
            {renderPatientInfo()}

            {/* Abnormalities / Key Findings */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-red-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800">Key Findings</h3>
              </div>
              <ul className="space-y-3">
                {(data.abnormalities || []).map((a, i) => {
                  const isAbnormal = !/no significant|normal/i.test(a);
                  return (
                    <li key={i} className={`flex items-start gap-3 text-sm p-3 rounded-xl ${ isAbnormal ? 'bg-red-50' : 'bg-green-50' }`}>
                      {isAbnormal
                        ? <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={15} />
                        : <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={15} />}
                      <span className={`leading-relaxed font-medium ${ isAbnormal ? 'text-red-700' : 'text-green-700' }`}>{a}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Conditions Explained — deep cards */}
            {Array.isArray(data.disease_explanations) && data.disease_explanations.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="text-red-500" size={18} />
                  <h3 className="text-sm font-bold text-gray-800">Conditions Explained</h3>
                </div>
                <div className="space-y-4">
                  {data.disease_explanations.map((exp, i) => {
                    const urgency  = exp.urgency || 'Routine';
                    const urgStr = urgency.toLowerCase();
                    let urgBadge = 'text-green-700 bg-green-50 border-green-200';
                    if (urgStr.includes('soon')) urgBadge = 'text-orange-700 bg-orange-50 border-orange-200';
                    else if (urgStr.includes('urgent')) urgBadge = 'text-white bg-red-700 border-red-800';

                    const sevStr = (exp.severity || '').toLowerCase();
                    let sevBadge = 'text-gray-700 bg-gray-100 border-gray-200';
                    if (sevStr.includes('mild')) sevBadge = 'text-green-700 bg-green-50 border-green-200';
                    else if (sevStr.includes('moderate') || sevStr.includes('borderline')) sevBadge = 'text-orange-700 bg-orange-50 border-orange-200';
                    else if (sevStr.includes('severe')) sevBadge = 'text-red-700 bg-red-50 border-red-200';

                    const isAbnormal = (exp.status || '').toLowerCase() === 'abnormal';
                    
                    let cardStyle = 'border-gray-100 bg-white';
                    let icon = <CheckCircle2 className="text-green-500" size={16} />;
                    let titleStyle = 'text-gray-800';
                    
                    if (sevStr.includes('mild')) {
                        cardStyle = 'border-green-100 bg-green-50/40';
                        icon = <AlertCircle className="text-green-600" size={16} />;
                        titleStyle = 'text-green-800';
                    } else if (sevStr.includes('moderate') || sevStr.includes('borderline')) {
                        cardStyle = 'border-orange-100 bg-orange-50/40';
                        icon = <AlertCircle className="text-orange-500" size={16} />;
                        titleStyle = 'text-orange-800';
                    } else if (sevStr.includes('severe') || isAbnormal) {
                        cardStyle = 'border-red-100 bg-red-50/40';
                        icon = <AlertCircle className="text-red-500" size={16} />;
                        titleStyle = 'text-red-700';
                    }

                    return (
                      <div key={i} className={`rounded-2xl border p-5 ${cardStyle}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {icon}
                            <h4 className={`text-sm font-bold ${titleStyle}`}>{exp.disease_name}</h4>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {exp.severity && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${sevBadge}`}>{exp.severity}</span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${urgBadge}`}>{urgency}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-700 space-y-2 mb-3">
                          <p className="line-clamp-3"><strong className="text-gray-900">What it means & Causes:</strong> {exp.simple_explanation}</p>
                          {exp.treatment && (
                            <p className="line-clamp-3"><strong className="text-gray-900">What to do:</strong> {exp.treatment}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FINAL AI ASSESSMENT CARD */}
            <div className="bg-white rounded-2xl p-6 border border-[#0063F2]/20 shadow-lg mt-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#0063F2]" />
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="text-[#0063F2]" size={20} />
                <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">Final AI Assessment</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Major Abnormalities</p>
                  <p className="text-[12px] text-gray-700 font-medium">
                    {ecgAbnormal.length > 0 ? ecgAbnormal.map(a => a.metric).join(', ') : 'None detected.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Cardiovascular Risk</p>
                  <p className={`text-[12px] font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                    {score >= 80 ? 'Low' : score >= 60 ? 'Moderate' : 'High'} Risk Profile
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Doctor Summary</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed font-medium italic">
                    {data.summary || 'The ECG rhythm appears stable. Continue routine monitoring.'}
                  </p>
                </div>
                {data.simple_summary && (
                <div>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Easy-to-Understand Summary</p>
                  <div className="text-[12px] text-gray-800 leading-relaxed font-semibold bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                    <ul className="list-disc pl-4 space-y-1">
                      {data.simple_summary.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0).map((sentence, idx) => (
                        <li key={idx}>{sentence}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                )}
                {data.recommendations && data.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Recommended Next Step</p>
                    <p className="text-[12px] text-gray-800 font-bold">
                      {data.recommendations[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">
            <div className="bg-[#1a237e] text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-blue-300" />
                <h3 className="text-sm font-bold">AI Recommendations</h3>
              </div>
              <div className="space-y-3">
                {(data.recommendations || []).map((rec, i) => {
                  let category = '';
                  let colorClass = '';
                  let bgClass = '';
                  if (i === 0) {
                    category = 'Top Priority';
                    colorClass = 'text-red-400';
                    bgClass = 'bg-red-400/10 border-red-400/20';
                  } else if (i === 1) {
                    category = 'Secondary';
                    colorClass = 'text-orange-400';
                    bgClass = 'bg-orange-400/10 border-orange-400/20';
                  } else if (i === 2) {
                    category = 'Lifestyle';
                    colorClass = 'text-green-400';
                    bgClass = 'bg-green-400/10 border-green-400/20';
                  } else {
                    category = 'Follow-up';
                    colorClass = 'text-blue-300';
                    bgClass = 'bg-blue-400/10 border-blue-400/20';
                  }
                  
                  return (
                    <div key={i} className={`rounded-xl p-3 border ${bgClass}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${colorClass}`}>{category}</p>
                      <p className="text-[11.5px] text-blue-50 leading-relaxed">{rec}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Metrics</p>
              <p className="text-3xl font-black text-gray-800">{ecgMetrics.length || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Normal Metrics</p>
              <p className="text-3xl font-black text-gray-800">{ecgNormal.length || '—'}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${ ecgAbnormal.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100' }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${ ecgAbnormal.length > 0 ? 'text-red-400' : 'text-gray-400' }`}>Abnormal Metrics</p>
              <p className={`text-3xl font-black ${ ecgAbnormal.length > 0 ? 'text-red-600' : 'text-gray-800' }`}>{ecgAbnormal.length || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderGynoReport = () => {
    const score = data.health_score || 0;
    const scoreText = score >= 85 ? 'Normal' : score >= 70 ? 'Needs Attention' : 'Higher Risk — Review Findings';
    const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';

    const pInfo = data.patient_info || {};
    const gynoMetrics = data.gyno_metrics || [];
    let findings = data.findings || [];
    
    // Front-end heuristic to keep findings short and prioritize abnormal
    const abnormalFindings = findings.filter(f => f.toLowerCase().includes('abnormal') || f.toLowerCase().includes('elevated') || f.toLowerCase().includes('low ') || f.toLowerCase().includes('high ') || f.toLowerCase().includes('previa') || f.toLowerCase().includes('oligohydramnios') || f.toLowerCase().includes('polyhydramnios') || f.toLowerCase().includes('resistance'));
    const normalFindings = findings.filter(f => !abnormalFindings.includes(f));
    
    let displayFindings = [];
    if (abnormalFindings.length > 0) {
      displayFindings = [...abnormalFindings];
      if (normalFindings.length > 0) {
        displayFindings.push("Other structural findings and growth parameters appear normal for gestational age.");
      }
    } else {
      if (normalFindings.length > 3) {
        displayFindings = normalFindings.slice(0, 3);
        displayFindings.push("Other structural findings and growth parameters appear normal for gestational age.");
      } else {
        displayFindings = normalFindings;
      }
    }
    
    if (displayFindings.length === 0 && findings.length > 0) {
        displayFindings = findings;
    }

    return (
      <div className="relative group space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 z-0">
        
        {/* ── BACKGROUND GLASSY WOMB/FOETUS UI ── */}
        <div className="absolute right-0 top-0 w-full h-[800px] overflow-hidden pointer-events-none -z-10">
          <div className="absolute right-[-10%] top-[-5%] md:right-[-5%] md:top-0 w-[500px] h-[500px] lg:w-[700px] lg:h-[700px] opacity-40 transition-all duration-[3000ms] ease-out group-hover:scale-[1.05] group-hover:-translate-y-8 group-hover:-rotate-3">
            {/* Soft glowing aura */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-300 via-rose-200 to-purple-300 rounded-full blur-[80px] opacity-50" />
            
            {/* Womb glass container */}
            <div className="absolute inset-10 bg-white/20 backdrop-blur-3xl border border-white/50 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] shadow-[0_8px_32px_0_rgba(255,182,193,0.2)] flex items-center justify-center overflow-hidden transition-all duration-[4000ms] ease-in-out group-hover:rounded-[50%_50%_55%_45%/45%_50%_50%_55%]">
              
              {/* Foetal abstract curve */}
              <div className="relative w-48 h-56 transition-transform duration-[3000ms] group-hover:scale-105 group-hover:rotate-6">
                {/* Head */}
                <div className="absolute top-4 left-6 w-20 h-20 bg-gradient-to-br from-rose-300/40 to-pink-400/40 rounded-full blur-md" />
                <div className="absolute top-6 left-8 w-16 h-16 bg-white/40 border border-white/60 rounded-full backdrop-blur-md shadow-inner" />
                
                {/* Body curve */}
                <div className="absolute top-20 left-10 w-28 h-32 bg-gradient-to-br from-purple-300/40 to-pink-300/40 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-md" />
                <div className="absolute top-22 left-12 w-24 h-28 bg-white/30 border border-white/50 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] backdrop-blur-md" />
                
                {/* Abstract umbilical cord line */}
                <svg className="absolute top-1/2 -right-12 w-32 h-32 overflow-visible opacity-60" viewBox="0 0 100 100">
                  <path d="M0,50 C30,80 70,20 100,50" fill="none" stroke="url(#cord-grad)" strokeWidth="3" strokeLinecap="round" className="animate-pulse" style={{ animationDuration: '3s' }} />
                  <defs>
                    <linearGradient id="cord-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Tiny heartbeat glow */}
                <div className="absolute top-28 left-20 w-3 h-3 bg-rose-400/80 rounded-full blur-[2px] animate-ping" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 1. PREGNANCY OVERVIEW ── */}
        <div className="bg-gradient-to-r from-pink-50 via-rose-50/50 to-purple-50 rounded-2xl border border-pink-100 p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Baby className="text-pink-500" size={24} />
            Pregnancy Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm flex flex-col justify-center items-center text-center">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Health Score</span>
              <span className="text-4xl font-black mb-1" style={{ color: scoreColor }}>{score}</span>
              <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}>
                {scoreText}
              </span>
            </div>

            {/* Gestational Age */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="text-pink-400" size={16} />
                <span className="text-sm font-bold text-gray-700">Pregnancy Progress</span>
              </div>
              <span className="text-xl font-black text-gray-900 leading-tight mb-1">{pInfo.gestational_age || '—'}</span>
              <span className="text-xs text-gray-500">How far along the pregnancy is</span>
            </div>

            {/* EDD */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="text-purple-400" size={16} />
                <span className="text-sm font-bold text-gray-700">Expected Delivery</span>
              </div>
              <span className="text-xl font-black text-gray-900 leading-tight mb-1">{pInfo.expected_delivery_date_edd || '—'}</span>
              <span className="text-xs text-gray-500">Estimated due date</span>
            </div>

            {/* Fetal Heart Rate */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <HeartPulse className="text-rose-400" size={16} />
                <span className="text-sm font-bold text-gray-700">Baby's Heartbeat</span>
              </div>
              <span className="text-xl font-black text-gray-900 leading-tight mb-1">{data.fetal_heart_rate || '—'}</span>
              <span className="text-xs text-gray-500">Fetal heart rate</span>
            </div>
          </div>
        </div>

        {/* ── 2. PATIENT DETAILS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Patient Details</h3>
            <p className="text-lg font-black text-gray-900">{pInfo.name || 'Unknown Patient'}</p>
            <p className="text-sm text-gray-600">{pInfo.age ? `${pInfo.age} Years · ` : ''}{pInfo.gender || ''}</p>
          </div>
          <div className="text-left md:text-right text-sm text-gray-600 space-y-0.5">
            <p><span className="font-semibold text-gray-900">Patient ID:</span> {pInfo.patient_id || '—'}</p>
            <p><span className="font-semibold text-gray-900">Doctor:</span> {pInfo.doctor_name || '—'}</p>
            <p><span className="font-semibold text-gray-900">Report Date:</span> {pInfo.report_date || '—'}</p>
          </div>
        </div>

        {/* ── 3. ULTRASOUND & PREGNANCY METRICS (GRID, NO SCROLL) ── */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-pink-500" size={20} />
            Ultrasound & Pregnancy Metrics
          </h3>
          {gynoMetrics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gynoMetrics.map((m, idx) => {
                const st = (m.status || 'normal').toLowerCase();
                const isAbnormal = st.includes('abnormal') || st === 'high' || st === 'low';
                const isBorderline = st.includes('borderline') || st.includes('attention');
                
                let cardStyle = "bg-white border-gray-100";
                let dotColor = "bg-green-500";
                let statusTextColor = "text-green-700";
                let statusBgColor = "bg-green-50";

                if (isAbnormal) {
                  cardStyle = "bg-red-50/30 border-red-100";
                  dotColor = "bg-red-500";
                  statusTextColor = "text-red-700";
                  statusBgColor = "bg-red-50";
                } else if (isBorderline) {
                  cardStyle = "bg-amber-50/30 border-amber-100";
                  dotColor = "bg-amber-500";
                  statusTextColor = "text-amber-700";
                  statusBgColor = "bg-amber-50";
                }

                return (
                  <div key={idx} className={`p-4 rounded-xl border shadow-sm flex flex-col ${cardStyle}`}>
                    <span className="text-sm font-semibold text-gray-700 mb-1">{m.metric}</span>
                    <div className="mt-auto">
                      <span className="text-xl font-black text-gray-900">
                        {m.value} <span className="text-sm font-medium text-gray-500">{m.unit}</span>
                      </span>
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${statusTextColor}`}>
                          {m.status || 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-100">
              No specific metrics extracted from report.
            </div>
          )}
        </div>

        {/* ── 4. CLINICAL FINDINGS ── */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="text-purple-500" size={20} />
            Clinical Findings
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {displayFindings.length > 0 ? (
              <ul className="space-y-3">
                {displayFindings.map((f, i) => {
                  const isWarning = f.toLowerCase().includes('abnormal') || f.toLowerCase().includes('elevated') || f.toLowerCase().includes('resistance') || f.toLowerCase().includes('previa') || f.toLowerCase().includes('oligohydramnios') || f.toLowerCase().includes('polyhydramnios');
                  return (
                    <li key={i} className="flex gap-3 items-start">
                      {isWarning ? (
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      ) : (
                        <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
                      )}
                      <span className={`text-sm ${isWarning ? 'text-red-900 font-medium' : 'text-gray-700'}`}>{f}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No specific clinical findings reported.</p>
            )}
          </div>
        </div>

        {/* ── 5. WHAT THIS MEANS (SUMMARY) ── */}
        {data.summary && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="text-blue-500" size={20} />
              What This Means
            </h3>
            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 shadow-sm">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{data.summary}</p>
            </div>
          </div>
        )}

        {/* ── 6. RECOMMENDED NEXT STEPS ── */}
        {(data.recommendations?.length > 0 || data.follow_up_timeline?.length > 0) && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-teal-500" size={20} />
              Recommended Next Steps
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {data.recommendations?.length > 0 && (
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-700">{rec}</li>
                  ))}
                </ul>
              )}
              {data.follow_up_timeline?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Timeline</h4>
                  <div className="space-y-2">
                    {data.follow_up_timeline.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-800">{item.condition}</span>
                        <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-semibold">{item.timeline}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    );
  };


  const renderUnsupportedReport = () => (
    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
      <AlertCircle className="text-[#B8B8B8] mx-auto mb-3" size={32} />
      <h3 className="text-base font-bold text-[#020202] mb-1">Report Type Not Fully Supported</h3>
      <p className="text-[#B8B8B8] text-[11px]">This report was analyzed. Recommendations are shown in the action plan.</p>
    </div>
  );

  const reportComponents = {
    blood_test: renderBloodReport,
    eye_report: renderEyeReport,
    ecg_heart: renderECGReport,
    gyno_report: renderGynoReport,
  };
  const ReportView = reportComponents[data?.report_type] || renderUnsupportedReport;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* ── HEADER ── */}
      <header className="bg-white px-6 py-3 flex justify-between items-center w-full z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0063F2] rounded-lg">
            <Brain className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-[#020202] tracking-tight leading-none">
              MediScan AI
            </h1>
            <p className="text-[9px] text-[#B8B8B8] font-semibold">Medical Report Analyzer</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#f4f6f8] px-3 py-1.5 rounded-full border border-gray-200">
          <ShieldCheck className="text-[#0063F2]" size={13} />
          <span className="text-[#020202] font-bold text-[10px]">HIPAA Secure</span>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full overflow-x-hidden">
        {!data ? (
          /* Landing / Upload / Loading State */
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-56px)]">
            {/* ── LEFT COLUMN: HERO TEXT + UPLOAD ── */}
            <div className="flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12">
              {!loading ? (
                <div className="animate-in">
                  <h2 className="text-5xl md:text-6xl font-black text-[#020202] leading-tight mb-3">
                    Understand<br/>
                    <span className="text-[#0063F2]">Your Health</span><br/>
                    Instantly.
                  </h2>
                  <p className="text-[#B8B8B8] text-base leading-relaxed mb-7 max-w-md">
                    Upload your medical report and let our AI decode every biomarker, flag abnormal values, and give you a personalised health score — in seconds.
                  </p>

                  {/* Feature Tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {[
                      { icon: <Heart size={12} />, label: 'Heart Health' },
                      { icon: <Droplets size={12} />, label: 'Blood Markers' },
                      { icon: <Activity size={12} />, label: 'Liver & Kidney' },
                      { icon: <Pill size={12} />, label: 'Vitamins & More' },
                    ].map(({ icon, label }) => (
                      <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-[#020202] bg-white hover:border-[#0063F2] hover:text-[#0063F2] transition-colors cursor-default">
                        <span className="text-[#0063F2]">{icon}</span> {label}
                      </span>
                    ))}
                  </div>

                  {/* Upload Card */}
                  <div
                    className={`border-2 border-dashed rounded-2xl p-5 transition-all duration-300 cursor-pointer max-w-md ${
                      dragActive
                        ? 'border-[#0063F2] bg-[#0063F2]/5'
                        : 'border-gray-200 bg-white hover:border-[#0063F2]'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf" disabled={loading} />
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#0063F2]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Upload className="text-[#0063F2]" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#020202]">Upload Your Medical Report</p>
                        <p className="text-[10px] text-[#B8B8B8]">Drag & drop or click • PDF only • Max 10MB</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="w-full py-3 bg-[#0063F2] text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-md"
                      disabled={loading}
                    >
                      Choose File
                    </button>
                    {uploadError && (
                      <div className="mt-3 p-2.5 bg-red-50 text-red-500 rounded-xl flex items-center gap-2 text-xs font-semibold border border-red-100">
                        <AlertCircle size={13} /> {uploadError}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── LOADING STATE ── */
                <div className="animate-in max-w-md">
                  <h2 className="text-4xl font-black text-[#020202] leading-tight mb-2">
                    Analyzing<br/>
                    <span className="text-[#0063F2]">Your Report.</span>
                  </h2>
                  <p className="text-[#B8B8B8] text-sm mb-8">Our AI is reading every value. This takes just a few seconds.</p>

                  {isSuccess ? (
                    <div className="flex flex-col items-start space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="text-green-500" size={22} />
                        </div>
                        <div>
                          <p className="font-black text-[#020202] text-base">Analysis Complete!</p>
                          <p className="text-[#B8B8B8] text-xs">Generating your dashboard...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="space-y-4 mb-8">
                        {PROGRESS_STEPS.map((step, index) => (
                          <div key={index} className="flex items-center gap-3">
                            {index < currentStep ? (
                              <div className="w-5 h-5 rounded-full bg-[#0063F2] flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="text-white" size={12} />
                              </div>
                            ) : index === currentStep ? (
                              <div className="relative w-5 h-5 flex-shrink-0">
                                <div className="absolute inset-0 bg-[#0063F2]/30 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 bg-[#0063F2] rounded-full"></div>
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0"></div>
                            )}
                            <p className={`text-sm font-semibold ${
                              index < currentStep ? 'text-[#020202]' :
                              index === currentStep ? 'text-[#0063F2]' : 'text-[#B8B8B8]'
                            }`}>{step}</p>
                          </div>
                        ))}
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className="h-full bg-[#0063F2] rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress.toFixed(0)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-[#B8B8B8] uppercase tracking-wider">
                        <span>Processing</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: HERO IMAGE WITH FLOATING CARDS ── */}
            <div className="relative hidden lg:flex items-center justify-center bg-[#f0f4ff] overflow-hidden">
              {/* Background accent circles */}
              <div className="absolute w-[480px] h-[480px] rounded-full bg-[#0063F2]/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute w-[320px] h-[320px] rounded-full bg-[#0063F2]/8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

              {/* Floating accuracy stat — top left */}
              <div className="absolute top-12 left-8 bg-white rounded-2xl px-4 py-3 shadow-lg animate-float z-20">
                <p className="text-xs font-bold text-[#020202]">98.5<span className="text-[#B8B8B8]">%</span></p>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-3 w-1.5 rounded-sm ${i <= 4 ? 'bg-[#0063F2]' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>

              {/* Lung image */}
              <img
                src="/lungs_hero.png"
                alt="Medical anatomy"
                className="relative z-10 w-[380px] h-[380px] object-contain drop-shadow-2xl animate-float-delayed"
              />

              {/* Floating score card — bottom right */}
              <div className="absolute bottom-16 right-8 bg-[#020202] text-white rounded-2xl px-5 py-4 shadow-xl animate-float z-20 min-w-[140px]">
                <p className="text-[10px] font-semibold text-[#B8B8B8] mb-1">AI Health Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">95</span>
                  <span className="text-[#B8B8B8] text-xs">/100</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0063F2]" />
                  <span className="text-[10px] font-semibold text-[#B8B8B8]">Low Risk</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── RESULTS DASHBOARD ── */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-3">
               <div>
                  <h2 className="text-xl font-black text-[#020202] tracking-tight">Overview</h2>
                  <p className="text-[#B8B8B8] font-bold text-xs uppercase tracking-wider">Patient Health Results</p>
               </div>
               <div className="flex items-center gap-2">
                  <button
                    onClick={downloadReport}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-4 py-2 text-white bg-[#0063F2] rounded-xl hover:bg-[#0063F2]/90 transition-all font-bold text-xs shadow-sm disabled:opacity-50"
                  >
                    {isDownloading ? <Activity size={14} className="animate-spin" /> : <FileDown size={14} />} 
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={resetAnalysis}
                    className="flex items-center gap-1.5 px-4 py-2 text-[#020202] bg-white rounded-xl hover:bg-gray-50 transition-all font-bold text-xs border border-gray-200 shadow-sm"
                  >
                    <RotateCcw size={14} /> New Analysis
                  </button>
               </div>
            </div>

            {/* Dynamic Report Content */}
            <ReportView />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
