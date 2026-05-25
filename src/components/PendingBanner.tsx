export default function PendingBanner({ hasDocs }: { hasDocs: boolean }) {
  return (
    <div className="mx-auto mt-6 max-w-5xl px-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 shrink-0 text-amber-400">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-sm">
          <p className="font-semibold text-amber-200">
            {hasDocs ? "Your profile is pending verification" : "Finish getting verified"}
          </p>
          <p className="mt-0.5 text-amber-100/80">
            {hasDocs
              ? "Our team is reviewing your documents. Until you're approved you won't appear in the customer directory or show a Verified badge — you'll get an email the moment you're approved."
              : "Upload your driver's license and insurance on your account page to submit for verification. You'll appear in the directory once an admin approves you."}
          </p>
        </div>
      </div>
    </div>
  );
}
