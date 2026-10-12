import os
import json
import asyncio
from enum import Enum
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import glob

load_dotenv()

class VnRedListStatus(str, Enum):
    EX = "EX"
    EW = "EW"
    CR = "CR"
    EN = "EN"
    VU = "VU"
    NT = "NT"
    LC = "LC"
    DD = "DD"
    NE = "NE"

class CitesAppendix(str, Enum):
    APPENDIX_I = "APPENDIX_I"
    APPENDIX_II = "APPENDIX_II"
    APPENDIX_III = "APPENDIX_III"

class VnDecreeStatus(str, Enum):
    GROUP_IA = "GROUP_IA"
    GROUP_IB = "GROUP_IB"
    GROUP_IIA = "GROUP_IIA"
    GROUP_IIB = "GROUP_IIB"

class IUCNStatus(str, Enum):
    EX = "EX"
    EW = "EW"
    CR = "CR"
    EN = "EN"
    VU = "VU"
    NT = "NT"
    LC = "LC"
    DD = "DD"
    NE = "NE"

class DietType(str, Enum):
    CARNIVORE = "CARNIVORE"
    HERBIVORE = "HERBIVORE"
    OMNIVORE = "OMNIVORE"
    INSECTIVORE = "INSECTIVORE"
    PISCIVORE = "PISCIVORE"
    FRUGIVORE = "FRUGIVORE"
    NECTARIVORE = "NECTARIVORE"
    SCAVENGER = "SCAVENGER"
    OTHER = "OTHER"

class HabitatType(str, Enum):
    TERRESTRIAL = "TERRESTRIAL"
    FRESHWATER = "FRESHWATER"
    MARINE = "MARINE"
    FOREST = "FOREST"
    GRASSLAND = "GRASSLAND"
    WETLAND = "WETLAND"
    DESERT = "DESERT"
    MOUNTAIN = "MOUNTAIN"
    URBAN = "URBAN"
    OTHER = "OTHER"

class ActivityPattern(str, Enum):
    DIURNAL = "DIURNAL"
    NOCTURNAL = "NOCTURNAL"
    CREPUSCULAR = "CREPUSCULAR"
    CATHEMERAL = "CATHEMERAL"
    OTHER = "OTHER"

class SpeciesData(BaseModel):
    nameVn: str
    nameEn: str | None
    scientificName: str
    authorCitation: str | None
    synonyms: list[str]
    identificationDesc: str | None
    biologyDesc: str | None
    threatsDesc: str | None
    conservationDesc: str | None
    vnRedListStatus: VnRedListStatus | None
    citesAppendix: CitesAppendix | None
    vnDecreeStatus: VnDecreeStatus | None
    iucnStatus: IUCNStatus | None
    diet: DietType | None
    habitats: list[HabitatType]
    activityPattern: ActivityPattern | None

async def parse_file(filepath: str, client: genai.Client):
    with open(filepath, "r", encoding="utf-8") as f:
        markdown_content = f.read()

    prompt = f"""
Bạn là một chuyên gia sinh học. Hãy phân tích đoạn tài liệu Markdown sau đây (của một trang từ khóa về sinh vật rừng Việt Nam) và trích xuất thông tin thành định dạng JSON chuẩn theo schema được cung cấp.
Lưu ý quan trọng:
- Phân tích kỹ nội dung "Đặc điểm", "Sinh học, sinh thái", "Phân bố" để phán đoán chính xác các giá trị Enum (như diet, habitats, activityPattern, tình trạng bảo tồn). 
- Ví dụ: Thấy "hút mật hoa" -> NECTARIVORE, thấy "ăn lá", "ăn cỏ" -> HERBIVORE, thấy "ăn thịt", "chuột" -> CARNIVORE, thấy "ăn sâu bọ" -> INSECTIVORE. 
- Môi trường sống (habitats): "rừng nguyên sinh", "rừng thứ sinh" -> FOREST, "thung lũng", "núi" -> MOUNTAIN, v.v.
- Nếu không có thông tin hoặc không thể phán đoán chắc chắn, hãy để null.
- Giữ nguyên văn bản mô tả cho các trường Desc (identificationDesc, biologyDesc, conservationDesc).
- Nếu "Tên tiếng Anh" trong Markdown là "No english name", hãy thiết lập nameEn = null.
    
Tài liệu:
{markdown_content}
"""
    try:
        response = await client.aio.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SpeciesData,
                temperature=0.1
            ),
        )
        return response.text
    except Exception as e:
        print(f"Lỗi khi xử lý {filepath}: {e}")
        return None

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Không tìm thấy GEMINI_API_KEY")
        return
        
    client = genai.Client(api_key=api_key)
    input_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "json_output_ai")
    os.makedirs(output_dir, exist_ok=True)
    
    files = glob.glob(os.path.join(input_dir, "*.md"))
    if not files:
        print("Không tìm thấy file Markdown nào trong output/")
        return
        
    for filepath in files:
        filename = os.path.basename(filepath)
        json_filename = filename.replace('.md', '.json')
        json_filepath = os.path.join(output_dir, json_filename)
        if os.path.exists(json_filepath):
            print(f"Đã tồn tại file (bỏ qua): {json_filename}")
            continue

        print(f"Đang phân tích (AI): {filename} ...")
        json_result = await parse_file(filepath, client)
        
        if json_result:
            json_filename = filename.replace('.md', '.json')
            json_filepath = os.path.join(output_dir, json_filename)
            
            with open(json_filepath, 'w', encoding='utf-8') as f:
                # The response.text is already a JSON string, but we can parse and re-dump to format it
                try:
                    data = json.loads(json_result)
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"-> Đã lưu: {json_filename}")
                except json.JSONDecodeError:
                    f.write(json_result)
                    print(f"-> Đã lưu (raw): {json_filename}")
            
            await asyncio.sleep(2) # Avoid rate limits

if __name__ == "__main__":
    asyncio.run(main())
