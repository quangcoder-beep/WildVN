// SERVER COMPONENT
import { BentoCard } from "./BentoCard";
import { CONSERVATION_LABELS, DECREE_LABELS } from "@/app/_shared/constants/species";
import { getImageUrl } from "@/app/_shared/lib/media";
import { getStatusPresentation, taxonomyTrail } from "./species-detail-utils";

export function ChapterBento({ species }: { species: any }) {
  const vnRedListStatusLabel = CONSERVATION_LABELS[species.vnRedListStatus]?.label || species.vnRedListStatus || 'Chưa đánh giá';
  const status = getStatusPresentation(species.conservationStatus);
  const locations = Array.isArray(species.locations) ? species.locations : [];
  const references = Array.isArray(species.sourceReferences) ? species.sourceReferences : [];
  const taxonomy = taxonomyTrail(species.taxonomy, species.scientificName);

  const formatHistoryDate = (value: string | null | undefined) => {
    if (!value) return "Ngày chưa rõ";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
  };

  return (
    <section className="chapter-bento" id="chapter-bento">
      <div className="bento-header">
        <h2>The Scientific Terminal</h2>
        <p>Phân tích Dữ liệu Sinh học</p>
      </div>

      <div className="bento-grid">
        {/* Row 1 */}
        <BentoCard label="Phân bố / Khu vực" className="bento-col-span-2 bento-row-span-2">
          {locations.length > 0 ? (
            <div className="location-list">
              {locations.map((item: any, idx: number) => {
                const location = item.location || item;
                return (
                  <article key={location.id || location.slug || idx} className="location-item">
                    <div className="location-item__heading">
                      <span className="location-item__name">{location.name || 'Khu vực chưa rõ'}</span>
                      {item.distributionType && <span className="location-item__type">{item.distributionType}</span>}
                    </div>
                    {location.region && <span>Vùng: {location.region}</span>}
                    {location.climate && <span>Khí hậu: {location.climate}</span>}
                    {location.latitude != null && location.longitude != null && (
                      <span>Tọa độ: {location.latitude}, {location.longitude}</span>
                    )}
                    {location.locationDescription && <p>{location.locationDescription}</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="data-empty-state">
              <span className="data-empty-state__code">LOCATIONS / 00</span>
              <strong>Phân bố chưa được cập nhật</strong>
              <p>Thông tin khu vực sẽ xuất hiện khi dữ liệu khảo sát thực địa được bổ sung.</p>
            </div>
          )}
        </BentoCard>

        <BentoCard label="Sách Đỏ VN">
          <div className="card-value">{vnRedListStatusLabel}</div>
        </BentoCard>

        <BentoCard label="Phụ lục CITES">
          <div className="card-value">{species.citesAppendix && species.citesAppendix !== 'NONE' ? species.citesAppendix : 'Không'}</div>
        </BentoCard>

        {/* Row 2 */}
        <BentoCard label="Nghị định 84" className="bento-col-span-2">
          <div className="card-value">
            {species.vnDecreeStatus && species.vnDecreeStatus !== 'NONE' 
              ? DECREE_LABELS[species.vnDecreeStatus] || species.vnDecreeStatus 
              : 'Không'}
          </div>
        </BentoCard>

        <BentoCard label="Tình trạng Quốc tế" className="bento-col-span-2">
          <div className={`status-overview${status.isAssessed ? "" : " status-overview--pending"}`}>
            <div className="status-overview__code">{status.code}</div>
            <div className="status-overview__label">{status.label}</div>
            <p>{status.description}</p>
            {!status.isAssessed && <span className="status-overview__note">Chưa có dữ liệu định lượng</span>}
          </div>
        </BentoCard>

        {/* Row 3 */}
          <BentoCard label="Phân loại Sinh học" className="bento-col-span-4">
            <div className="taxonomy-list">
              {taxonomy.length > 0 ? taxonomy.map((node, i) => (
                <span key={`${node.id || node.scientificName}-${i}`} className={`taxonomy-item${i === taxonomy.length - 1 ? " taxonomy-item--current" : ""}`}>
                  {node.rank || "SPECIES"}: {node.scientificName} {i < taxonomy.length - 1 && <span className="taxonomy-arrow">›</span>}
                </span>
              )) : <span className="data-inline-empty">Phân loại đang được cập nhật.</span>}
              {species.authorCitation && <span className="taxonomy-item taxonomy-item--meta">Tác giả: {species.authorCitation}</span>}
              {species.nameEn && <span className="taxonomy-item taxonomy-item--meta">Tên tiếng Anh: {species.nameEn}</span>}
              {species.synonyms?.length > 0 && <span className="taxonomy-item taxonomy-item--meta">Tên đồng nghĩa: {species.synonyms.join(', ')}</span>}
            </div>
          </BentoCard>
      </div>
      
      {references.length > 0 && (
        <div className="bento-grid mt-4">
          <BentoCard label="Tài liệu tham khảo" className="bento-col-span-4">
            <ul className="list-disc pl-4 opacity-70 text-sm">
              {references.map((ref: any, idx: number) => (
                <li key={idx}>
                  {ref?.url ? <a href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.title || ref.url}</a> : (ref?.title || JSON.stringify(ref))}
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      )}

      {species.conservationHistory && species.conservationHistory.length > 0 && (
        <div className="bento-grid mt-4">
          <BentoCard label="Lịch sử Bảo tồn" className="bento-col-span-4">
            <ul className="list-disc pl-4 opacity-70 text-sm">
              {species.conservationHistory.map((history: any, idx: number) => (
                <li key={idx} className="mb-2">
                  <span className="font-bold text-white/90">
                    {formatHistoryDate(history.changedAt || history.eventDate)} - {history.newStatus || history.eventType || "Sự kiện"}:
                  </span>{" "}
                  {history.notes || history.details || history.source || "Thông tin chi tiết đang được cập nhật."}
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      )}

      {species.media && species.media.length > 1 && (
        <div className="bento-grid mt-4">
          <BentoCard label="Thư viện Media" className="bento-col-span-4">
            <div className="flex flex-wrap gap-4 mt-2">
              {species.media.map((mediaItem: any, idx: number) => (
                <div key={idx} className="relative w-32 h-32 overflow-hidden rounded border border-white/20">
                  <img 
                    src={getImageUrl(mediaItem.url)} 
                    alt={mediaItem.caption || `${species.scientificName} media`} 
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  {mediaItem.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white p-1 truncate">
                      {mediaItem.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      )}
    </section>
  );
}
