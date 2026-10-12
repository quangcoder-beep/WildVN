# WILD ACADEMY: THE DIGITAL EXPEDITION HUB
**Master Product & Design Architecture Document**
*Prepared by: Principal Product Designer & Frontend Architect*

---

## I. EXECUTIVE PRODUCT VISION

**Wild Academy** không phải là một blog giáo dục, không phải là một trang wiki khô khan. Nó là một **Học viện Viễn chinh Kỹ thuật số (Digital Expedition Hub)** — nơi người dùng đóng vai trò là một nhà nghiên cứu thực địa (Field Researcher), tham gia vào các hành trình khám phá đa dạng sinh học của Việt Nam.

**Cảm giác trải nghiệm (Vibe):**
*   **National Geographic meets Apple:** Hình ảnh lộng lẫy, typography sang trọng, tương tác mượt mà đến mức siêu thực. Không có những UI "game giáo dục" rẻ tiền, thay vào đó là sự nghiêm túc, sâu thẳm của khoa học kết hợp với công nghệ trình diễn đỉnh cao.
*   **Emotional Direction:** Huyền bí, tĩnh lặng, vĩ đại và đánh thức sự tò mò. Người dùng cảm thấy như đang cầm một thiết bị nghiên cứu công nghệ cao giữa rừng sâu.
*   **Learning Philosophy:** "Học qua Khám phá" (Discovery-based Learning). Kiến thức không bị ép nhồi nhét; kiến thức được "mở khóa" thông qua sự tò mò (scroll, click, listen).

---

## II. COMPLETE FEATURE ECOSYSTEM

Hệ sinh thái của Wild Academy chia làm 4 trụ cột chính:

### 1. Expedition Journeys (Cuộc Viễn Chinh)
*   Hành trình cuộn tuyến tính (Scroll-telling) kết hợp âm thanh không gian (Spatial Audio) và hiệu ứng thị giác (Parallax, WebGL Fog).
*   **Tính năng:** Hotspot discovery, Ambient sound sync, Chapter-based progression.

### 2. Research Labs (Phòng Thí Nghiệm Tương Tác)
*   **Soundscape Lab:** Nghe âm thanh rừng rậm/đại dương và nhận diện tiếng kêu của loài.
*   **Anatomy Explorer:** Khám phá cấu trúc giải phẫu 3D/2D (Ví dụ: Cơ chế sinh học của vảy Tê Tê).
*   **Threat Simulator:** Mô phỏng tác động của biến đổi khí hậu/phá rừng lên một sinh cảnh (Before/After slider).

### 3. The Quiz Arena (Đấu Trường Sinh Trắc)
*   Các bài kiểm tra nhỏ (Mini-tests) mang tính try-hard nhưng UI cực kỳ tinh tế.
*   **Chế độ:** Silhouette Recognition (Đoán bóng loài), Habitat Matching (Ghép loài với sinh cảnh), Survival Mode (Trả lời đúng liên tục trước khi hết giờ).

### 4. Field Notes & Collections (Sổ Tay Thực Địa)
*   Hệ thống thẻ bài kỹ thuật số (Digital Cards). Khi user hoàn thành Expedition hoặc Quiz, họ "thu thập" được thông tin loài vào Field Notes.
*   Mỗi loài giống như một NFT siêu đẹp (không dùng blockchain, chỉ là cảm giác sưu tầm premium).

---

## III. INFORMATION ARCHITECTURE

**Cấu trúc Navigation:**
```text
/academy
├── /expeditions (Các chuyên đề viễn chinh)
│   └── /[slug] (Chi tiết hành trình: Scroll-telling)
├── /labs (Phòng thí nghiệm tương tác)
│   ├── /soundscapes (Bản đồ âm thanh)
│   └── /anatomy (Mô phỏng giải phẫu)
├── /arena (Đấu trường trắc nghiệm)
│   ├── /flashcards (Ôn tập Spaced Repetition)
│   └── /survival (Thử thách sinh tồn thời gian thực)
└── /field-notes (Hồ sơ người dùng & Bộ sưu tập)
    ├── /collection (Các loài đã mở khóa)
    └── /achievements (Huy hiệu & Kỷ lục)
```

---

## IV. GAMIFICATION SYSTEM

**Mục tiêu:** Addictive nhưng Premium. Tránh dùng sao (stars) hay xu (coins).

*   **Hệ thống XP (Research Points - RP):** Tích lũy thông qua việc đọc hết Expedition, click tìm hotspot ẩn, hoàn thành quiz.
*   **Hệ thống Cấp Bậc (Ranks):**
    *   *Novice Observer* (Người Quan Sát)
    *   *Field Tracker* (Người Theo Dấu)
    *   *Senior Biologist* (Nhà Sinh Học)
    *   *Master Conservationist* (Chuyên Gia Bảo Tồn)
*   **Cơ chế Mở Khóa (Discovery Mechanics):** Một số bài Quiz hoặc Lab cao cấp chỉ mở khi user đã thu thập đủ 5 loài trong Field Notes.
*   **Streak System:** Nhật ký thực địa (Field Log). Đăng nhập và học mỗi ngày để duy trì streak. UI hiển thị streak giống như biểu đồ hoạt động GitHub nhưng với màu sắc sinh học (Bio-glow).

---

## V. QUIZ & MINI TEST ECOSYSTEM

Thiết kế UI của Quiz không được giống Kahoot (quá màu mè/trẻ con). Nó phải giống như một **Hệ thống Đánh giá của Tổ chức SCP hoặc NASA**.

*   **Flashcard Memory (Spaced Repetition):** Lật thẻ bài 3D. Mặt trước là hình ảnh/âm thanh, mặt sau là thông tin. Người dùng tự đánh giá mức độ nhớ (Hard/Good/Easy).
*   **Rapid-fire Challenge:** Màn hình tối, đồng hồ đếm ngược viền đỏ (tension). Trả lời liên tục 10 câu hỏi nhận diện sinh cảnh trong 60 giây. Càng trả lời nhanh, âm thanh nhịp tim/đồng hồ đếm ngược càng dồn dập.
*   **Boss Challenge (Expedition Exam):** Cuối mỗi Expedition, có một bài test tổng hợp. Hoàn thành 100% không sai câu nào sẽ mở khóa "Huy hiệu Vàng Thực Địa".

---

## VI. INTERACTIVE LEARNING SYSTEMS

*   **Hotspot Exploration:** Trong các bức ảnh phong cảnh cực lớn, người dùng rà chuột. Con trỏ chuột biến đổi (Custom Cursor) khi quét qua một "dấu vết" (vết chân, xước vỏ cây). Click để phân tích dấu vết đó.
*   **Migration Maps:** Trực quan hóa đường bay của sếu đầu đỏ thông qua bản đồ tương tác (deck.gl / Mapbox), kéo thanh trượt thời gian (timeline slider) để thấy chúng di chuyển theo mùa.

---

## VII. CINEMATIC STORYTELLING SYSTEM

*   **Ambient Transitions:** Chuyển cảnh giữa các màn hình bằng hiệu ứng Fade to Black sâu, hoặc Zoom-in mượt mà vào một bức ảnh.
*   **Pacing & Tension:** Không show toàn bộ thông tin cùng lúc. Chữ hiện ra theo hiệu ứng mờ dần khi cuộn (Reveal on Scroll).
*   **Environmental Storytelling:** Giao diện có thể thay đổi nhẹ tùy theo sinh cảnh đang đọc. (Đang đọc về Voọc Cát Bà -> Background tint màu xanh rêu/đá vôi; Đang đọc về Sao La -> Background tint màu sương mù Trường Sơn).

---

## VIII. AUDIO EXPERIENCE SYSTEM

*   **Audio UI:** Không chỉ là nút Play/Pause. Nút âm thanh phải có Audio Visualizer nhỏ (sóng âm) phản ứng theo thời gian thực (Reactive Audio).
*   **Headphone Mode Suggestion:** Ngay khi vào trang, một toast siêu đẹp hiện lên: *"Recommend using headphones for the spatial audio experience"*.
*   **Layered Audio:** Khi cuộn, âm thanh không bị giật mà dùng `GainNode` để crossfade (fade out nhạc rừng mưa, fade in tiếng gió đỉnh núi).

---

## IX. UI/UX DESIGN SYSTEM

*   **Aesthetics:** Cinematic Minimalism, Scientific UI, Dark Mode Default.
*   **Glassmorphism + Bio-Glow:** Các panel thông tin sử dụng kính mờ (backdrop-filter) với viền siêu mỏng (1px border `rgba(255,255,255,0.05)`). Phía sau panel là một khối màu blur lớn (Bio-glow) tương ứng với màu của sinh cảnh.
*   **Typography:** Phông chữ Serif (như Playfair Display hoặc Newsreader) cho các tiêu đề lớn, mang tính biên niên sử/báo chí. Phông chữ Mono (như JetBrains Mono hoặc Space Mono) cho các metadata, caption, UI labels để tạo cảm giác công nghệ, nghiên cứu.

---

## X. MOTION SYSTEM DESIGN

*   **Quy tắc tối thượng (Motion Restraint):** Chuyển động phải mượt (60-120fps) nhưng không được "nhún nhảy" lố lăng. Sử dụng các hàm `spring` có tính cản (damping) cao để tạo cảm giác nặng, thực tế.
*   **Scroll Choreography:** Mọi thành phần đều phản ứng với cuộn, nhưng với các hệ số Parallax khác nhau (Chữ di chuyển nhanh hơn hình nền, sương mù di chuyển ngược chiều cuộn).
*   **Hover Systems:** Magnetic hover cho các thẻ Bento. Khi rà chuột qua, thẻ nghiêng nhẹ 3D theo hướng chuột, ánh sáng hắt bóng trên mặt thẻ (Spotlight effect).

---

## XI. MOBILE EXPERIENCE

*   **Mobile-First Adaptation:** Hủy bỏ Parallax phức tạp và WebGL trên mobile để tiết kiệm pin. Thay thế bằng CSS gradients tĩnh và transform đơn giản.
*   **Touch Interactions:** Hỗ trợ Swipe để lật flashcard (như Tinder UI nhưng học thuật), Pinch-to-zoom cho các ảnh giải phẫu.
*   **Simplified Cinematic Mode:** Chế độ đọc toàn màn hình trên mobile (tự động giấu thanh điều hướng khi cuộn xuống).

---

## XII. SOCIAL & COMMUNITY FEATURES

*   **Shareable Discoveries:** Khi người dùng mở khóa một loài mới, hệ thống render một thẻ ảnh (Card) tuyệt đẹp (có gradient, tên user, rank hiện tại) tối ưu cho Instagram Story / Facebook.
*   **Conservation Identity:** Hồ sơ người dùng không hiển thị "Level 5". Nó hiển thị: "Nhà nghiên cứu sinh cảnh Rừng Mưa - Đã khám phá 12/50 loài".

---

## XIII. EDUCATIONAL PSYCHOLOGY

*   **Curiosity Loops:** Chừa lại những "khoảng trống thông tin" (Information Gap). Thấy một tấm thẻ đen ghi chữ "Loài bí ẩn - Cần hoàn thành Viễn chinh Sao La để mở khóa" sẽ kích thích dopamine tò mò tột độ.
*   **Spaced Repetition:** Flashcard không lặp lại ngẫu nhiên, mà tính toán thời gian người dùng quên để đưa ra câu hỏi, tăng cường Retention Rate (Tỉ lệ giữ chân học tập).
*   **Endowment Effect:** Cảm giác sở hữu "Field Notes" khiến user muốn lấp đầy bộ sưu tập của mình, tạo động lực quay lại hàng ngày.

---

## XIV. PRODUCTION FEASIBILITY (ROADMAP)

**Phase 1 (The Core Hub & Expedition) - Bắt đầu ngay:**
*   Hoàn thiện Bento Hub.
*   Hoàn thiện Expedition Scroller (như đã refactor) với MDX.
*   Thiết lập AudioManager cơ bản.

**Phase 2 (The Quiz & Field Notes) - Tháng tiếp theo:**
*   Hệ thống Field Notes (UI Grid danh sách loài đã học).
*   Zustand Store để lưu tiến trình (Local Storage trước, Auth/DB sau).
*   Flashcard Memory Game.

**Phase 3 (The Labs & Multiplayer) - Dài hạn:**
*   Soundscape Lab.
*   Tài khoản đăng nhập, đồng bộ server.
*   Leaderboard / Streak online.

---

## XV. FINAL MASTER EXPERIENCE

**Hành trình người dùng (The User Journey):**
1.  **Mở trang:** User truy cập `/academy`. Một màn hình đen tuyền hiện ra trong nửa giây, rồi fade in logo "WILDVN ACADEMY" kèm tiếng rít rất nhỏ của côn trùng rừng đêm (nếu đã cấp quyền âm thanh).
2.  **Khám phá Bento Hub:** Họ thấy giao diện lưới. Các khối bento lơ lửng, phản ứng với chuột. Họ nhấp vào "Kỳ Lân Trường Sơn".
3.  **Học (The Expedition):** Thanh âm thanh tự động nổi lên, tiếng lá xào xạc hòa cùng nhạc nền Epic nhưng tĩnh lặng. Họ cuộn qua những bức ảnh full màn hình, đọc thông tin hiện ra từng dòng. Họ thấy một điểm sáng (hotspot) nhấp nháy trên ảnh rừng, bấm vào, mở ra thông tin về "Bẫy ảnh".
4.  **Chơi (The Assessment):** Cuối hành trình, một nút "Thử thách nhận diện" xuất hiện. Họ hoàn thành 3 câu hỏi nhanh.
5.  **Unlock & Sưu tầm:** Pháo hoa hạt nhỏ (particle) nổ nhẹ, thông báo "Đã thu thập: Sao La vào Sổ tay Thực địa". Gợi ý share lên mạng xã hội.
6.  **Quay lại:** Ngày hôm sau, họ muốn mở khóa "Voọc Cát Bà" để lấp đầy thẻ trống tiếp theo.

*Đây là một sản phẩm Digital Flagship thực thụ, cân bằng hoàn hảo giữa tính giáo dục, thiết kế điện ảnh và công nghệ Web tối tân.*
