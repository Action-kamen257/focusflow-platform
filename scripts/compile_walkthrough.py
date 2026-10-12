import os
import glob
from PIL import Image

frames_dir = r"D:\tushar\hackathon\hackathon\frames"
output_gif = r"D:\tushar\hackathon\hackathon\images\focusflow_walkthrough.gif"

all_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.jpg")))
total_frames = len(all_files)
print(f"Total raw captured frames: {total_frames}")

# Target ~90-100 frames for a smooth, high-fps GIF without excessive file size
step = max(1, total_frames // 95)
selected_files = all_files[::step]
print(f"Sampling every {step}th frame -> {len(selected_files)} frames selected.")

# Target resolution: 880 width (standard GitHub README width)
target_width = 880

images = []
for idx, filepath in enumerate(selected_files):
    with Image.open(filepath) as img:
        # Calculate aspect ratio
        w, h = img.size
        target_height = int(h * (target_width / w))
        resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        # Convert to P mode (palette) with adaptive palette to keep size small and sharp
        quantized = resized.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        images.append(quantized)
    if (idx + 1) % 20 == 0:
        print(f"Processed {idx + 1}/{len(selected_files)} frames...")

print(f"Saving animated GIF to {output_gif}...")
# Set duration per frame to ~130ms (~7.7 fps)
images[0].save(
    output_gif,
    save_all=True,
    append_images=images[1:],
    duration=130,
    loop=0,
    optimize=True
)

file_size_kb = os.path.getsize(output_gif) / 1024
print(f"SUCCESS! Created {output_gif}: {file_size_kb:.1f} KB ({file_size_kb/1024:.2f} MB)")
