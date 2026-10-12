import urllib.request
import xml.etree.ElementTree as ET

def fetch_sitemap_urls(sitemap_url):
    print(f"Đang tải sitemap: {sitemap_url}")
    req = urllib.request.Request(sitemap_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        
        # Sitemap XML namespace
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        urls = []
        for loc in root.findall('.//ns:loc', namespace):
            if loc.text:
                urls.append(loc.text)
        return urls
    except Exception as e:
        print(f"Lỗi khi tải {sitemap_url}: {e}")
        return []

def generate_vncreatures_urls():
    sitemaps = [
        "https://vncreatures.net/species-sitemap.xml",
        "https://vncreatures.net/species-sitemap2.xml"
    ]
    
    output_file = "vietnam_animals_urls.txt"
    all_urls = []
    
    for sm in sitemaps:
        urls = fetch_sitemap_urls(sm)
        all_urls.extend(urls)
        
    print(f"Tìm thấy tổng cộng {len(all_urls)} link...")
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("# DANH SÁCH URL CÁC LOÀI ĐỘNG VẬT TẠI VIỆT NAM\n")
        f.write(f"# Trích xuất tự động từ Sitemap của vncreatures.net\n\n")
        for url in all_urls:
            f.write(url + "\n")
            
    print(f"Hoàn tất! Đã lưu {len(all_urls)} URL vào file {output_file}.")

if __name__ == "__main__":
    generate_vncreatures_urls()
