#!/usr/bin/env python3
"""
WildVN Data Crawler
Sources: GBIF (species + images) + Wikipedia VI (descriptions) + IUCN status mapping
"""
import json, time, uuid, re, unicodedata, urllib.request, urllib.parse

# ── Ecosystems ────────────────────────────────────────────────────────────────
ECOSYSTEMS = [
    {"name":"Rừng Mưa Nhiệt Đới","slug":"rung-mua-nhiet-doi","region":"Miền Trung","climate":"Nhiệt đới ẩm",
     "thumbnailUrl":"https://images.unsplash.com/photo-1448375240586-882707db888b?w=800",
     "description":"Rừng mưa nhiệt đới là hệ sinh thái phong phú nhất Việt Nam, trải dài dọc dãy Trường Sơn. Đây là nơi cư trú của hàng nghìn loài động thực vật quý hiếm.",
     "locationDescription":"Phân bố chủ yếu tại Miền Trung và Tây Nguyên.",
     "threats":"Phá rừng, khai thác gỗ lậu, chuyển đổi đất nông nghiệp."},
    {"name":"Rừng Ngập Mặn","slug":"rung-ngap-man","region":"Đồng Bằng Sông Cửu Long","climate":"Nhiệt đới gió mùa",
     "thumbnailUrl":"https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=800",
     "description":"Rừng ngập mặn Việt Nam, đặc biệt là Cà Mau, là một trong những khu rừng ngập mặn lớn nhất Đông Nam Á, bảo vệ bờ biển và là nơi sinh sản của nhiều loài thủy sản.",
     "locationDescription":"Tập trung ở đồng bằng sông Cửu Long, đặc biệt là Cà Mau và Kiên Giang.",
     "threats":"Nuôi tôm, ô nhiễm, nước biển dâng do biến đổi khí hậu."},
    {"name":"Vùng Núi Cao","slug":"vung-nui-cao","region":"Tây Bắc","climate":"Cận nhiệt đới",
     "thumbnailUrl":"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
     "description":"Vùng núi cao Tây Bắc với đỉnh Fansipan 3.147m là mái nhà của Đông Dương. Khí hậu đặc trưng tạo nên hệ sinh thái độc đáo với nhiều loài đặc hữu.",
     "locationDescription":"Dãy Hoàng Liên Sơn, Tây Bắc Việt Nam.",
     "threats":"Canh tác nương rẫy, khai thác khoáng sản, du lịch không bền vững."},
    {"name":"Thảo Nguyên Khô","slug":"thao-nguyen-kho","region":"Tây Nguyên","climate":"Nhiệt đới xavan",
     "thumbnailUrl":"https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800",
     "description":"Thảo nguyên Tây Nguyên với mùa khô kéo dài là môi trường sống của các loài thú lớn và chim đặc trưng vùng đất đỏ bazan.",
     "locationDescription":"Cao nguyên Tây Nguyên: Đắk Lắk, Gia Lai, Kon Tum.",
     "threats":"Chuyển đổi đất trồng cà phê, phá rừng, hạn hán."},
    {"name":"Biển và Đảo","slug":"bien-va-dao","region":"Vịnh Bắc Bộ & Biển Đông","climate":"Nhiệt đới biển",
     "thumbnailUrl":"https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800",
     "description":"Vùng biển Việt Nam với 3.260km bờ biển và hơn 3.000 hòn đảo là nơi cư trú của rùa biển, cá heo, san hô và hàng trăm loài cá quý hiếm.",
     "locationDescription":"Từ vịnh Bắc Bộ đến vịnh Thái Lan, bao gồm quần đảo Hoàng Sa và Trường Sa.",
     "threats":"Đánh bắt quá mức, rác thải nhựa, tẩy trắng san hô."},
]

# ── Target species with real scientific names ─────────────────────────────────
SPECIES_TARGETS = [
    # Thú - Rừng Mưa Nhiệt Đới
    {"name":"Sao la","sci":"Pseudoryx nghetinhensis","vi_wiki":"Sao_la","category":"Thú","eco":0,"status":"CR","featured":True},
    {"name":"Hổ Đông Dương","sci":"Panthera tigris corbetti","vi_wiki":"Hổ_Đông_Dương","category":"Thú","eco":0,"status":"CR","featured":True},
    {"name":"Voọc chà vá chân nâu","sci":"Pygathrix nemaeus","vi_wiki":"Voọc_chà_vá_chân_nâu","category":"Thú","eco":0,"status":"EN","featured":True},
    {"name":"Báo hoa mai","sci":"Panthera pardus","vi_wiki":"Báo_hoa_mai","category":"Thú","eco":0,"status":"VU","featured":True},
    {"name":"Tê tê Java","sci":"Manis javanica","vi_wiki":"Tê_tê_Java","category":"Thú","eco":0,"status":"CR","featured":True},
    {"name":"Khỉ đuôi lợn","sci":"Macaca leonina","vi_wiki":"Khỉ_đuôi_lợn","category":"Thú","eco":0,"status":"VU","featured":False},
    {"name":"Voi châu Á","sci":"Elephas maximus","vi_wiki":"Voi_châu_Á","category":"Thú","eco":0,"status":"EN","featured":True},
    {"name":"Bò rừng","sci":"Bos gaurus","vi_wiki":"Bò_tót","category":"Thú","eco":0,"status":"VU","featured":True},
    # Thú - Vùng Núi Cao
    {"name":"Vượn đen má trắng","sci":"Nomascus leucogenys","vi_wiki":"Vượn_đen_má_trắng","category":"Thú","eco":2,"status":"CR","featured":True},
    {"name":"Gấu ngựa","sci":"Ursus thibetanus","vi_wiki":"Gấu_ngựa","category":"Thú","eco":2,"status":"VU","featured":True},
    {"name":"Gấu chó","sci":"Helarctos malayanus","vi_wiki":"Gấu_chó","category":"Thú","eco":2,"status":"VU","featured":False},
    {"name":"Sơn dương","sci":"Capricornis sumatraensis","vi_wiki":"Sơn_dương","category":"Thú","eco":2,"status":"VU","featured":False},
    # Thú - Thảo Nguyên
    {"name":"Bò tót","sci":"Bos gaurus","vi_wiki":"Bò_tót","category":"Thú","eco":3,"status":"VU","featured":True},
    {"name":"Hươu sao","sci":"Cervus nippon","vi_wiki":"Hươu_sao","category":"Thú","eco":3,"status":"LC","featured":True},
    {"name":"Hươu vàng","sci":"Axis porcinus","vi_wiki":"Hươu_vàng","category":"Thú","eco":3,"status":"EN","featured":False},
    # Chim - Rừng Ngập Mặn
    {"name":"Cò thìa mặt đen","sci":"Platalea minor","vi_wiki":"Cò_thìa_mặt_đen","category":"Chim","eco":1,"status":"EN","featured":True},
    {"name":"Sếu đầu đỏ","sci":"Grus antigone","vi_wiki":"Sếu_đầu_đỏ","category":"Chim","eco":1,"status":"VU","featured":True},
    {"name":"Chim cốc đại","sci":"Pelecanus philippensis","vi_wiki":"Bồ_nông_chân_xám","category":"Chim","eco":1,"status":"VU","featured":False},
    # Chim - Rừng Mưa Nhiệt Đới
    {"name":"Trĩ sao","sci":"Rheinartia ocellata","vi_wiki":"Trĩ_sao","category":"Chim","eco":0,"status":"NT","featured":True},
    {"name":"Công xanh","sci":"Pavo muticus","vi_wiki":"Công_xanh","category":"Chim","eco":0,"status":"EN","featured":True},
    {"name":"Hồng hoàng","sci":"Buceros bicornis","vi_wiki":"Hồng_hoàng","category":"Chim","eco":0,"status":"VU","featured":True},
    {"name":"Gà lôi lam mào trắng","sci":"Lophura edwardsi","vi_wiki":"Gà_lôi_lam_mào_trắng","category":"Chim","eco":0,"status":"CR","featured":True},
    # Chim - Vùng Núi Cao
    {"name":"Đại bàng đen","sci":"Ictinaetus malaiensis","vi_wiki":"Đại_bàng_đen","category":"Chim","eco":2,"status":"LC","featured":True},
    # Bò Sát - Biển
    {"name":"Rùa da","sci":"Dermochelys coriacea","vi_wiki":"Rùa_da","category":"Bò sát","eco":4,"status":"VU","featured":True},
    {"name":"Rùa xanh","sci":"Chelonia mydas","vi_wiki":"Rùa_xanh","category":"Bò sát","eco":4,"status":"EN","featured":True},
    {"name":"Rùa Hoàn Kiếm","sci":"Rafetus swinhoei","vi_wiki":"Rùa_Hoàn_Kiếm","category":"Bò sát","eco":4,"status":"CR","featured":True},
    # Bò Sát - Rừng
    {"name":"Kỳ đà hoa","sci":"Varanus salvator","vi_wiki":"Kỳ_đà_hoa","category":"Bò sát","eco":1,"status":"LC","featured":False},
    {"name":"Rắn lục đuôi đỏ","sci":"Trimorphodon biscutatus","vi_wiki":"Rắn_lục_đuôi_đỏ","category":"Bò sát","eco":0,"status":"LC","featured":False},
    {"name":"Cá sấu nước ngọt","sci":"Crocodylus siamensis","vi_wiki":"Cá_sấu_hoa_cà","category":"Bò sát","eco":1,"status":"CR","featured":True},
    # Lưỡng Cư
    {"name":"Ếch cây sần lớn","sci":"Theloderma asperum","vi_wiki":"Ếch_cây","category":"Lưỡng cư","eco":2,"status":"LC","featured":False},
    {"name":"Cóc mày","sci":"Ophryophryne","vi_wiki":"Cóc","category":"Lưỡng cư","eco":2,"status":"NT","featured":False},
    # Cá
    {"name":"Cá heo Irrawaddy","sci":"Orcaella brevirostris","vi_wiki":"Cá_heo_Irrawaddy","category":"Cá","eco":4,"status":"EN","featured":True},
    {"name":"Cá mập voi","sci":"Rhincodon typus","vi_wiki":"Cá_mập_voi","category":"Cá","eco":4,"status":"EN","featured":True},
]

STATUS_MAP = {
    "CR": "Cực kỳ nguy cấp (CR)",
    "EN": "Nguy cấp (EN)",
    "VU": "Dễ bị tổn thương (VU)",
    "NT": "Sắp bị đe dọa (NT)",
    "LC": "Ít lo ngại (LC)",
}

def to_slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    text = re.sub(r'[^a-z0-9\s-]', '', text.lower())
    return re.sub(r'[\s-]+', '-', text).strip('-')

def fetch_wiki(title):
    try:
        url = f"https://vi.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'WildVN-Crawler/2.0 (educational)'})
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read().decode())
        desc = d.get('extract', '')
        thumb = d.get('thumbnail', {}).get('source', '')
        return desc or '', thumb or ''
    except Exception as e:
        print(f"  ⚠ Wiki error [{title}]: {e}")
        return '', ''

def fetch_gbif_image(scientific_name):
    """Get image from GBIF - completely free, no auth"""
    try:
        q = urllib.parse.urlencode({'scientificName': scientific_name, 'mediaType': 'StillImage', 'limit': 1, 'hasCoordinate': 'false'})
        url = f"https://api.gbif.org/v1/occurrence/search?{q}"
        req = urllib.request.Request(url, headers={'User-Agent': 'WildVN-Crawler/2.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read().decode())
        results = d.get('results', [])
        if results and results[0].get('media'):
            img = results[0]['media'][0].get('identifier', '')
            if img and img.startswith('http'):
                return img
    except Exception as e:
        print(f"  ⚠ GBIF error [{scientific_name}]: {e}")
    return ''

def fetch_gbif_scientific_name(sci):
    """Verify/enrich scientific name from GBIF backbone"""
    try:
        q = urllib.parse.urlencode({'name': sci, 'limit': 1})
        url = f"https://api.gbif.org/v1/species/suggest?{q}"
        req = urllib.request.Request(url, headers={'User-Agent': 'WildVN-Crawler/2.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            results = json.loads(r.read().decode())
        if results:
            return results[0].get('canonicalName', sci)
    except:
        pass
    return sci

# Fun facts per category
FUN_FACTS = {
    "Thú": [
        "Loài thú này có vai trò quan trọng trong chuỗi thức ăn của hệ sinh thái.",
        "Đây là một trong những loài thú hiếm gặp nhất tại Việt Nam.",
        "Số lượng loài này đang giảm mạnh do mất môi trường sống.",
    ],
    "Chim": [
        "Loài chim này di cư hàng nghìn km mỗi năm.",
        "Tiếng hót của loài chim này có thể nghe thấy từ xa hàng cây số.",
        "Đây là loài chim đặc trưng của vùng sinh thái này.",
    ],
    "Bò sát": [
        "Loài bò sát này đã tồn tại từ thời khủng long.",
        "Nhiệt độ môi trường quyết định giới tính của con non.",
        "Đây là một trong những loài bò sát nguy cấp nhất Đông Nam Á.",
    ],
    "Lưỡng cư": [
        "Lưỡng cư là chỉ thị môi trường sinh thái rất nhạy cảm.",
        "Loài này có thể hô hấp qua da.",
        "Da của loài lưỡng cư này tiết chất độc bảo vệ cơ thể.",
    ],
    "Cá": [
        "Loài cá này có thể di cư hàng nghìn km trong đại dương.",
        "Đây là một trong những loài cá lớn nhất vùng biển Việt Nam.",
        "Loài cá này là chỉ thị quan trọng của sức khỏe đại dương.",
    ],
}

DIET_MAP = {
    "Thú": "Tùy loài: có thể ăn thực vật (lá, quả, hạt) hoặc động vật nhỏ như côn trùng, cá, thú nhỏ.",
    "Chim": "Chủ yếu ăn côn trùng, hạt, quả, hoặc cá và động vật nhỏ tùy theo loài.",
    "Bò sát": "Ăn côn trùng, lưỡng cư, cá nhỏ, hoặc thực vật tùy theo loài.",
    "Lưỡng cư": "Chủ yếu ăn côn trùng, giun đất và các động vật không xương sống nhỏ.",
    "Cá": "Ăn sinh vật phù du, cá nhỏ, hoặc thực vật thủy sinh tùy loài.",
}

def build_data():
    out = {"ecosystems": [], "species": []}
    eco_ids = []

    print("📍 Building ecosystems...")
    for eco in ECOSYSTEMS:
        eco_id = str(uuid.uuid4())
        eco_ids.append(eco_id)
        out["ecosystems"].append({
            "id": eco_id,
            "name": eco["name"],
            "slug": eco["slug"],
            "region": eco["region"],
            "climate": eco["climate"],
            "thumbnailUrl": eco["thumbnailUrl"],
            "description": eco["description"],
            "locationDescription": eco["locationDescription"],
            "threats": eco["threats"],
            "galleryUrls": "[]",
            "speciesCount": 0,
        })

    print(f"\n🦁 Crawling {len(SPECIES_TARGETS)} species...\n")
    for i, sp in enumerate(SPECIES_TARGETS):
        print(f"[{i+1}/{len(SPECIES_TARGETS)}] {sp['name']} ({sp['sci']})...")

        # 1. Get description from Vietnamese Wikipedia
        desc, wiki_thumb = fetch_wiki(sp["vi_wiki"])
        time.sleep(0.5)

        # 2. Get image from GBIF if Wikipedia has none
        img_url = wiki_thumb
        if not img_url:
            img_url = fetch_gbif_image(sp["sci"])
            time.sleep(0.4)

        # Fallback image by category
        if not img_url:
            fallbacks = {
                "Thú":      "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800",
                "Chim":     "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800",
                "Bò sát":   "https://images.unsplash.com/photo-1503066211613-c17ebc9daef0?w=800",
                "Lưỡng cư": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                "Cá":       "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800",
            }
            img_url = fallbacks.get(sp["category"], "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800")

        if not desc:
            desc = f"{sp['name']} ({sp['sci']}) là một loài {sp['category'].lower()} thuộc hệ sinh thái {ECOSYSTEMS[sp['eco']]['name']} của Việt Nam. Đây là loài được ghi nhận trong Sách đỏ IUCN với tình trạng {STATUS_MAP[sp['status']]}."

        import random
        fun_facts_list = FUN_FACTS.get(sp["category"], ["Đây là loài động vật quý hiếm cần được bảo vệ."])
        fun_fact = random.choice(fun_facts_list)

        species_entry = {
            "id": str(uuid.uuid4()),
            "name": sp["name"],
            "slug": to_slug(sp["name"]),
            "scientificName": sp["sci"],
            "category": sp["category"],
            "habitat": ECOSYSTEMS[sp["eco"]]["name"],
            "thumbnailUrl": img_url,
            "tags": f"động vật, {sp['category'].lower()}, hoang dã, việt nam, bảo tồn, sách đỏ",
            "description": desc[:1500],  # cap at 1500 chars
            "diet": DIET_MAP.get(sp["category"], "Đa dạng theo loài."),
            "conservationStatus": STATUS_MAP[sp["status"]],
            "funFacts": fun_fact,
            "galleryUrls": "[]",
            "ecosystemId": eco_ids[sp["eco"]],
            "isFeatured": sp["featured"],
        }
        out["species"].append(species_entry)
        print(f"  ✅ Done | img={'yes' if img_url else 'no'} | desc={len(desc)} chars")

    # Save to both locations
    paths = [
        "src/main/resources/seed/data.json",
        "../../wildvn-client/app/api/data.json",
    ]
    for path in paths:
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(out, f, ensure_ascii=False, indent=2)
            print(f"\n✅ Saved → {path}")
        except Exception as e:
            print(f"⚠ Could not save to {path}: {e}")

    print(f"\n🎉 Done! {len(out['species'])} species, {len(out['ecosystems'])} ecosystems")
    stats = {}
    for s in out["species"]:
        stats[s["category"]] = stats.get(s["category"], 0) + 1
    for cat, count in sorted(stats.items()):
        print(f"  {cat}: {count} loài")

if __name__ == '__main__':
    build_data()
