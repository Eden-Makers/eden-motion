"""Example config for comp.py: one line of text standing on a wall behind the subject.
Copy it, change the numbers, run:  python tools/scenetext/comp.py plates/s03 cfg_s03.py out/s03 --fps 60
All positions are in the REFERENCE camera: cx, cy in reference pixels, z in metres on the DepthPro scale
(read the wall's depth from PLATE_DIR/depth/<ref>.npy), wpx the width of the canvas in pixels at that
distance. span = frames the block is on. render(t) returns the RGBA texture of the canvas.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ktext import Text  # noqa: E402

CW, CH = 2400, 400
TXT = Text(CW, CH, [dict(text="HOLD FN.", size=300, y=310, units="glyph", times=[0.0 + 0.04 * i for i in range(7)],
                         base=(245, 245, 245), accent=(0, 230, 122), dur=0.22, blur=10, grow=0.25, rise=0.15)])
BLOCKS = [dict(canvas=(CW, CH), z=3.2, cx=960, cy=420, wpx=1500, yaw=-6, pitch=0, span=(0, 287),
               render=lambda t: TXT.frame(t), occlude=True, opacity=0.95, defocus=0.8)]
