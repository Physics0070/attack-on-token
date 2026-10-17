/** Tiny imperative bridge between the 3D scene and DOM mechanics (no React re-renders). */
export const bossBus: { hit?: () => void } = {}
