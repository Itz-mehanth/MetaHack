import { Color, type Material, type MeshStandardMaterial } from '@iwsdk/core';

/**
 * A hologram look for lit materials: the dark armour keeps its shading, gains
 * a bright fresnel edge in the hero's colour, slow scanlines that climb the
 * body and a faint flicker. It turns a blocky statue into a projected hero.
 * Each patched material owns its colour; `time` is shared by a whole group.
 */
export interface HoloState {
  color: Color;
  time: { value: number };
}

export function holoPatch(material: Material, state: HoloState, strength = 1): void {
  const standard = material as MeshStandardMaterial;
  if (!standard.isMeshStandardMaterial) return;
  standard.onBeforeCompile = (shader) => {
    shader.uniforms.uHoloColor = { value: state.color };
    shader.uniforms.uHoloTime = state.time;
    shader.uniforms.uHoloK = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHoloY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vHoloY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHoloColor;\nuniform float uHoloTime;\nuniform float uHoloK;\nvarying float vHoloY;')
      .replace(
        '#include <dithering_fragment>',
        `
        float holoRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
        float holoScan = 0.5 + 0.5 * sin(vHoloY * 110.0 - uHoloTime * 5.0);
        float holoSweep = smoothstep(0.96, 1.0, sin(vHoloY * 3.0 - uHoloTime * 1.6));
        float holoFlick = 0.93 + 0.07 * sin(uHoloTime * 41.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * (uHoloColor * 0.9 + 0.25), 0.55 * uHoloK);
        gl_FragColor.rgb += uHoloColor * (holoRim * 1.5 + holoScan * 0.07 + holoSweep * 0.5) * uHoloK * holoFlick;
        #include <dithering_fragment>`,
      );
  };
  standard.customProgramCacheKey = () => 'surge-holo';
  standard.needsUpdate = true;
}
