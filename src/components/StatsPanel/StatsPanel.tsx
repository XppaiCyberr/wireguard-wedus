import { useRef, useEffect, useCallback } from 'react';
import type { PeerStats, SpeedDataPoint } from '../../lib/types';
import { formatBytes, formatSpeed, formatTimestamp, formatDuration } from '../../lib/utils';
import './StatsPanel.css';

interface StatsPanelProps {
  stats: PeerStats | null;
  speedHistory: SpeedDataPoint[];
  connectionStartTime: number | null;
}

export default function StatsPanel({
  stats,
  speedHistory,
  connectionStartTime,
}: StatsPanelProps) {
  if (!stats) return null;

  const elapsed = connectionStartTime
    ? Math.floor(Date.now() / 1000) - connectionStartTime
    : 0;

  // Handshake health
  const handshakeAge = stats.latest_handshake > 0
    ? Math.floor(Date.now() / 1000) - stats.latest_handshake
    : Infinity;
  const healthClass = handshakeAge < 180 ? 'good' : handshakeAge < 600 ? 'warn' : 'bad';

  // Current speed (last data point)
  const lastPoint = speedHistory[speedHistory.length - 1];
  const currentDownSpeed = lastPoint?.download ?? 0;
  const currentUpSpeed = lastPoint?.upload ?? 0;

  return (
    <div className="stats-panel">
      {/* Stats Cards */}
      <div className="stats-grid">
        {/* Download */}
        <div className="stats-card">
          <div className="stats-card-header">
            <svg className="stats-card-icon stats-card-icon--download" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="8" y1="2" x2="8" y2="12" />
              <polyline points="4,8 8,12 12,8" />
            </svg>
            <span className="stats-card-label">Download</span>
          </div>
          <div className="stats-card-value">{formatSpeed(currentDownSpeed)}</div>
          <div className="stats-card-sub">{formatBytes(stats.transfer_rx)} total</div>
        </div>

        {/* Upload */}
        <div className="stats-card">
          <div className="stats-card-header">
            <svg className="stats-card-icon stats-card-icon--upload" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="8" y1="14" x2="8" y2="4" />
              <polyline points="4,8 8,4 12,8" />
            </svg>
            <span className="stats-card-label">Upload</span>
          </div>
          <div className="stats-card-value">{formatSpeed(currentUpSpeed)}</div>
          <div className="stats-card-sub">{formatBytes(stats.transfer_tx)} total</div>
        </div>

        {/* Handshake */}
        <div className="stats-card">
          <div className="stats-card-header">
            <svg className="stats-card-icon stats-card-icon--handshake" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 8c2-4 4-4 6 0s4 4 6 0" />
            </svg>
            <span className="stats-card-label">Handshake</span>
          </div>
          <div className="stats-card-value">
            {formatTimestamp(stats.latest_handshake)}
            <span className={`stats-health-dot stats-health-dot--${healthClass}`} />
          </div>
          <div className="stats-card-sub">{stats.endpoint || '—'}</div>
        </div>

        {/* Duration */}
        <div className="stats-card">
          <div className="stats-card-header">
            <svg className="stats-card-icon stats-card-icon--duration" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <polyline points="8,4 8,8 11,10" />
            </svg>
            <span className="stats-card-label">Duration</span>
          </div>
          <div className="stats-card-value">{formatDuration(elapsed)}</div>
          <div className="stats-card-sub">Uptime</div>
        </div>
      </div>

      {/* Traffic Chart */}
      <TrafficChart speedHistory={speedHistory} />
    </div>
  );
}

/* ============================================
   Canvas Traffic Chart
   ============================================ */

interface TrafficChartProps {
  speedHistory: SpeedDataPoint[];
}

function TrafficChart({ speedHistory }: TrafficChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle HiDPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 8, bottom: 4, left: 52 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Data
    const points = speedHistory.slice(-60);
    if (points.length < 2) return;

    // Find max value for Y scale
    let maxVal = 1024; // minimum 1 KB/s
    for (const p of points) {
      if (p.download > maxVal) maxVal = p.download;
      if (p.upload > maxVal) maxVal = p.upload;
    }
    maxVal = maxVal * 1.2; // headroom

    // Grid lines
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.fillStyle = '#6E7681';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatSpeedShort(val), padding.left - 8, y);
    }

    // Helper to plot a line
    const plotLine = (
      data: number[],
      color: string,
      dashed: boolean
    ) => {
      if (data.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dashed) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / 59) * (59 - (data.length - 1 - i));
        const y = padding.top + chartH - (data[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Area fill (subtle)
      if (!dashed) {
        ctx.lineTo(
          padding.left + (chartW / 59) * 59,
          padding.top + chartH
        );
        ctx.lineTo(
          padding.left + (chartW / 59) * (59 - (data.length - 1)),
          padding.top + chartH
        );
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, color.replace(')', ', 0.15)').replace('rgb', 'rgba'));
        grad.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    };

    const downloadData = points.map((p) => p.download);
    const uploadData = points.map((p) => p.upload);

    plotLine(downloadData, 'rgb(63, 185, 80)', false);
    plotLine(uploadData, 'rgb(249, 117, 131)', true);

    ctx.setLineDash([]);
  }, [speedHistory]);

  useEffect(() => {
    draw();
    // Redraw on resize
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  return (
    <div className="stats-chart-container">
      <div className="stats-chart-header">
        <span className="stats-chart-title">Traffic (60s)</span>
        <div className="stats-chart-legend">
          <div className="stats-legend-item">
            <span className="stats-legend-line stats-legend-line--download" />
            Download
          </div>
          <div className="stats-legend-item">
            <span className="stats-legend-line stats-legend-line--upload" />
            Upload
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="stats-chart-canvas" />
    </div>
  );
}

function formatSpeedShort(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}
