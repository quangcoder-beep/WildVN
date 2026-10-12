import os
import json
import re

def parse_markdown_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    data = {
        "nameVn": None,
        "nameEn": None,
        "scientificName": None,
        "synonyms": [],
        "identificationDesc": None,
        "biologyDesc": None,
        "conservationDesc": None,
        # Default enums to None or empty, since regex can't easily guess them
        "diet": None,
        "habitats": [],
        "activityPattern": None,
    }

    # 1. Parse nameVn (from the first H1 header)
    name_vn_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if name_vn_match:
        data["nameVn"] = name_vn_match.group(1).strip()

    # 2. Parse from Markdown table
    name_en_match = re.search(r'\|\s*Tên tiếng Anh:\s*\|\s*(.+?)\s*\|', content)
    if name_en_match:
        name_en = name_en_match.group(1).strip()
        data["nameEn"] = None if name_en.lower() == "no english name" else name_en

    sci_name_match = re.search(r'\|\s*Tên Latin:\s*\|\s*(.+?)\s*\|', content)
    if sci_name_match:
        data["scientificName"] = sci_name_match.group(1).strip()

    synonyms_matches = re.finditer(r'\|\s*Đồng danh:\s*\|\s*(.+?)\s*\|', content)
    for match in synonyms_matches:
        data["synonyms"].append(match.group(1).strip())

    # 3. Parse Descriptions using bold headings
    # Identification
    ident_match = re.search(r'\*\*Đặc điểm nh[ậa]n dạng:\*\*(.+?)(?=\*\*|$)', content, re.DOTALL)
    if ident_match:
        data["identificationDesc"] = ident_match.group(1).strip()

    # Biology
    bio_match = re.search(r'\*\*Sinh học, sinh thái:\*\*(.+?)(?=\*\*|$)', content, re.DOTALL)
    if bio_match:
        data["biologyDesc"] = bio_match.group(1).strip()

    # Distribution / Conservation
    dist_match = re.search(r'\*\*Phân bố:\*\*(.+?)(?=\*\*|$)', content, re.DOTALL)
    if dist_match:
        data["conservationDesc"] = dist_match.group(1).strip()

    return data

def main():
    input_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "json_output")
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(input_dir):
        print("Thư mục output/ chưa tồn tại.")
        return

    for filename in os.listdir(input_dir):
        if filename.endswith(".md"):
            filepath = os.path.join(input_dir, filename)
            parsed_data = parse_markdown_file(filepath)
            
            # Save to JSON
            json_filename = filename.replace('.md', '.json')
            json_filepath = os.path.join(output_dir, json_filename)
            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(parsed_data, f, ensure_ascii=False, indent=2)
            
            print(f"Đã xử lý: {filename} -> {json_filename}")

if __name__ == "__main__":
    main()
