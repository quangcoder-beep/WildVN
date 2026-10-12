// SERVER COMPONENT — no 'use client' needed

interface SpecimenTagProps {
  slug: string;
  status: string;
  citationYear: number | null;
}

export function SpecimenTag({ slug, status, citationYear }: SpecimenTagProps) {
  const id = slug.toUpperCase().padStart(3, "0");

  return (
    <div className="specimen-tag" aria-label="Thông tin tiêu bản">
      <div className="specimen-tag__line">
        <span className="specimen-tag__key">// SPECIMEN</span>
        <span className="specimen-tag__val">{id}</span>
      </div>
      <div className="specimen-tag__divider" />
      <div className="specimen-tag__line">
        <span className="specimen-tag__key">STATUS</span>
        <span className="specimen-tag__val specimen-tag__val--alert">{status}</span>
      </div>
      {citationYear && (
        <div className="specimen-tag__line">
          <span className="specimen-tag__key">CITATION</span>
          <span className="specimen-tag__val">{citationYear}</span>
        </div>
      )}
    </div>
  );
}
