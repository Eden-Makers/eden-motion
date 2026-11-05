// The one HyperFrames version every step runs. Pinned so a render is reproducible; bump it here
// (and re-render a test project to compare) instead of in each step.
export const HF_VERSION = "0.9.15";
export const HF_PKG = `hyperframes@${HF_VERSION}`;
// argv prefix for `npx`: npx [...HF, "render", ...]
export const HF = ["-y", HF_PKG];
