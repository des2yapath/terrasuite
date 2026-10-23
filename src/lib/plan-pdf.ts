// Client-side PDF export of a crop plan via jsPDF — no server, no cost.
// Layout: title block → summary/scores → zone cards → intercropping →
// rotation → tips → footer with attribution + page numbers.

import { jsPDF } from "jspdf";
import type { CropPlan } from "@/lib/crop-engine";
import type { Parcel } from "@/data/parcel";
import { haToAcres } from "@/data/parcel";

const MARGIN = 18;
const PAGE_W = 210;  // A4 mm
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function exportPlanPdf(parcel: Parcel, plan: CropPlan): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) { addFooter(); doc.addPage(); y = MARGIN; }
  };

  const addFooter = () => {
    const page = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `TerraSuite — generated ${new Date().toLocaleDateString()} · data: Sentinel-2/ESA WorldCover (Google Earth Engine), ISRIC SoilGrids, Open-Meteo`,
      MARGIN, PAGE_H - 10,
    );
    doc.text(`${page}`, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
  };

  // Title block
  doc.setFontSize(18);
  doc.setTextColor(20, 60, 30);
  doc.text("TerraSuite Crop Plan", MARGIN, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`${parcel.name} · ${parcel.crop} · ${haToAcres(parcel.area)} acres`, MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`${parcel.location} · plan source: ${plan.source === "ai" ? "AI (Gemini 2.5 Flash)" : "local agronomy model"}`, MARGIN, y);
  y += 10;

  // Summary + scores
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Summary", MARGIN, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(60);
  const summaryLines = doc.splitTextToSize(plan.summary, CONTENT_W);
  ensureSpace(summaryLines.length * 4.5);
  doc.text(summaryLines, MARGIN, y);
  y += summaryLines.length * 4.5 + 3;
  doc.text(
    `Overall score: ${plan.overall_score}/10 · Estimated water saving: ${plan.water_saving_pct}% · Est. revenue increase: ${plan.expected_revenue_increase_pct}%`,
    MARGIN, y,
  );
  y += 9;

  // Zones
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Zones", MARGIN, y);
  y += 6;
  plan.zones.forEach((z) => {
    ensureSpace(26);
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(`${z.name} — ${z.areaPct}% · ${z.season}`, MARGIN, y);
    y += 4.5;
    doc.setFontSize(8.5);
    doc.setTextColor(80);
    const reason = doc.splitTextToSize(z.reason, CONTENT_W);
    doc.text(reason, MARGIN, y);
    y += reason.length * 3.8;
    doc.text(`spacing ${z.spacingM} m · water ${z.waterNeeds} · yield ${z.yieldEst}`, MARGIN, y);
    y += 6;
  });
  y += 3;

  // Intercropping
  if (plan.intercropping.length > 0) {
    ensureSpace(16);
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Intercropping", MARGIN, y);
    y += 6;
    plan.intercropping.forEach((p) => {
      ensureSpace(16);
      doc.setFontSize(9.5);
      doc.setTextColor(30);
      doc.text(`${p.primary} + ${p.secondary}`, MARGIN, y);
      y += 4.5;
      doc.setFontSize(8.5);
      doc.setTextColor(80);
      const benefit = doc.splitTextToSize(`${p.benefit} (${p.spacing})`, CONTENT_W);
      doc.text(benefit, MARGIN, y);
      y += benefit.length * 3.8 + 3;
    });
    y += 2;
  }

  // Rotation
  ensureSpace(30);
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Rotation Plan", MARGIN, y);
  y += 6;
  plan.rotation_plan.forEach((s) => {
    ensureSpace(12);
    const current = s.season === plan.currentSeason ? " (current)" : "";
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    doc.text(`${s.season}${current} — ${s.months}: ${s.crops.join(" → ")}`, MARGIN, y);
    y += 5.5;
  });
  y += 5;

  // Tips
  ensureSpace(20);
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Recommendations", MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(60);
  plan.tips.forEach((t) => {
    const lines = doc.splitTextToSize(`• ${t}`, CONTENT_W - 4);
    ensureSpace(lines.length * 4 + 2);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 4 + 2;
  });

  addFooter();
  doc.save(`terrasuite-plan-${parcel.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
