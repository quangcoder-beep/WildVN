// SERVER COMPONENT
import {
  translateActivityPattern,
  translateDietType,
  translateHabitatTypes,
} from "./species-detail-utils";

export function JourneySlide1({ species }: { species: any }) {
  return (
    <div className="journey-slide slide-habitat">
      <div className="slide-bg" aria-hidden="true" />
      <span className="slide-number">01</span>
      <div className="slide-content">
        <h2 className="slide-heading">Đặc điểm hình thái.</h2>
        <p className="slide-text">
          {species.identificationDesc || species.description || "Thông tin mô tả đang được cập nhật."}
        </p>
      </div>
    </div>
  );
}

export function JourneySlide2({ species }: { species: any }) {
  return (
    <div className="journey-slide">
      <span className="slide-number">02</span>
      <div className="slide-split">
        <div className="slide-content">
          <h2 className="slide-heading">Sinh học &amp; Tập tính.</h2>
          <p className="slide-text">
            {species.biologyDesc || species.funFacts || "Thông tin sinh học và sinh thái học đang được cập nhật."}
          </p>
        </div>
        <ul className="biology-list">
          <li>
            Chế độ ăn: <span>{species.dietType ? translateDietType(species.dietType) : (species.diet || "Chưa cập nhật")}</span>
          </li>
          <li>
            Môi trường sống: <span>{species.habitatType?.length ? translateHabitatTypes(species.habitatType) : (species.habitat || "Chưa cập nhật")}</span>
          </li>
          <li>
            Tập tính hoạt động: <span>{translateActivityPattern(species.activityPattern)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function JourneySlide3({ species }: { species: any }) {
  return (
    <div className="journey-slide journey-slide--conservation">
      <span className="slide-number">03</span>
      <div className="slide-content slide-content--wide">
        <h2 className="slide-heading">Bảo tồn &amp; Mối đe dọa.</h2>
        <div className="slide-split slide-split--conservation">
          <div className="slide-content slide-content--column">
            <h3 className="slide-subheading">Mối đe dọa</h3>
            <p className="slide-text slide-text--compact">
              {species.threatsDesc || "Thông tin mối đe dọa đang được cập nhật."}
            </p>
          </div>
          <div className="slide-content slide-content--column">
            <h3 className="slide-subheading">Tình trạng bảo tồn</h3>
            <p className="slide-text slide-text--compact">
              {species.conservationDesc || "Thông tin tình trạng bảo tồn đang được cập nhật."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JourneySlide4() {
  return (
    <div className="journey-slide slide-cta">
      <div className="slide-content slide-cta__content">
        <h2 className="slide-heading slide-heading--dark">Bảo vệ những cá thể cuối cùng.</h2>
        <p className="slide-text slide-text--dark">
          Mọi nỗ lực bảo tồn đều đếm từng ngày. Cùng WildVN ghi nhận và lan tỏa dữ liệu đáng tin cậy.
        </p>
        <button className="btn-brutalist btn-brutalist--dark" type="button">
          Tìm hiểu Dự án
        </button>
      </div>
    </div>
  );
}
