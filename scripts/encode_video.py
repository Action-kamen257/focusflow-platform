import subprocess
import os

ffmpeg_exe = r"C:\Program Files\Lenovo\GamingAI\2.2.0105.1301\services\editor\ffmpeg.exe"
mp4_out = r"D:\tushar\hackathon\hackathon\images\focusflow_walkthrough.mp4"
gif_out = r"D:\tushar\hackathon\hackathon\images\focusflow_walkthrough.gif"

import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

print("Step 1: Compiling 1198 frames into 30 FPS MP4 video...")
cmd_mp4 = [
    ffmpeg_exe, "-y",
    "-framerate", "30",
    "-i", r"D:\tushar\hackathon\hackathon\frames_smooth\frame_%06d.jpg",
    "-c:v", "h264_mf",
    "-b:v", "3000k",
    "-pix_fmt", "yuv420p",
    mp4_out
]
res = subprocess.run(cmd_mp4, capture_output=True, text=True)
if res.returncode != 0:
    print("MP4 Error:", res.stderr)
else:
    size_mb = os.path.getsize(mp4_out) / (1024 * 1024)
    print(f"MP4 Video Generated: {mp4_out} ({size_mb:.2f} MB)")

print("Step 2: Generating high-framerate, non-laggy GIF via two-pass palette filters...")
# Two-pass palette generation for optimal smoothness and colors without stutter
palette_png = r"D:\tushar\hackathon\hackathon\images\palette.png"

cmd_pal = [
    ffmpeg_exe, "-y",
    "-i", mp4_out,
    "-vf", "fps=18,scale=880:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff",
    palette_png
]
subprocess.run(cmd_pal, check=True)

cmd_gif = [
    ffmpeg_exe, "-y",
    "-i", mp4_out,
    "-i", palette_png,
    "-lavfi", "fps=18,scale=880:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
    gif_out
]
res_gif = subprocess.run(cmd_gif, capture_output=True, text=True)
if res_gif.returncode != 0:
    print("GIF Error:", res_gif.stderr)
else:
    gif_mb = os.path.getsize(gif_out) / (1024 * 1024)
    print(f"GIF Generated: {gif_out} ({gif_mb:.2f} MB)")

if os.path.exists(palette_png):
    os.remove(palette_png)

print("Complete!")
