"use client";

import { useState } from "react";

/** "Download my trips": the driver's own trip log as a spreadsheet (CSV), by tax year or all time. */
export default function TripDownload({ years }: { years: number[] }) {
  const [year, setYear] = useState(String(years[0]));
  return (
    <div className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Download my trips</h2>
        <p className="text-sm text-muted">A spreadsheet of your trips, miles, expenses and net profit, with totals. Handy for taxes. Photos aren&apos;t included.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select aria-label="Which trips" value={year} onChange={(e) => setYear(e.target.value)} className="rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
          <option value="all">All trips</option>
        </select>
        <a href={`/api/trips/export?year=${year}`} download className="btn-primary rounded-full px-5 py-2.5 text-sm">Download (CSV)</a>
      </div>
    </div>
  );
}
