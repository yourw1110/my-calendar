import os
from PIL import Image, ImageDraw

def create_rounded_icon(img, size):
    # 丸いアイコンを作成
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(resized, (0, 0), mask)
    return output

def generate_icons(source_path):
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found")
        return

    src = Image.open(source_path).convert("RGBA")
    
    # --- Android Icons ---
    android_res = "android/app/src/main/res"
    android_sizes = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192
    }
    
    for folder, size in android_sizes.items():
        path = f"{android_res}/mipmap-{folder}"
        os.makedirs(path, exist_ok=True)
        
        # Square
        sq = src.resize((size, size), Image.Resampling.LANCZOS)
        sq.save(f"{path}/ic_launcher.png")
        
        # Round
        rd = create_rounded_icon(src, size)
        rd.save(f"{path}/ic_launcher_round.png")
    
    # --- Web Icons ---
    public_dir = "public"
    os.makedirs(public_dir, exist_ok=True)
    
    # Favicon (Standard 32x32)
    src.resize((32, 32), Image.Resampling.LANCZOS).save(f"{public_dir}/favicon.ico")
    
    # PWA Icons
    src.resize((192, 192), Image.Resampling.LANCZOS).save(f"{public_dir}/icon-192.png")
    src.resize((512, 512), Image.Resampling.LANCZOS).save(f"{public_dir}/icon-512.png")
    src.resize((180, 180), Image.Resampling.LANCZOS).save(f"{public_dir}/apple-touch-icon.png")
    
    print("All icons generated successfully.")

if __name__ == "__main__":
    source = r"C:\Users\yourw\.gemini\antigravity\brain\4db87cb3-40d9-4e79-a91d-f0af15893c8f\media__1777625157791.png"
    generate_icons(source)
