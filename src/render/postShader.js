import * as THREE from 'three';

/**
 * Upgraded PS1/VHS Psychological Horror Post-Processing Shader:
 * - VHS horizontal chroma bleed & tape tracking micro-jitter
 * - Realistic Flashlight radial cone highlight & edge falloff
 * - 4 Selectable Cosmetic VHS Shader Themes (0 Standard, 1 Camcorder '98 Green, 2 Bleach Bypass, 3 PSX 4x4 Dither)
 */
export function createPostShaderMaterial(diffuseTexture, isRetro = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: diffuseTexture },
      uTime: { value: 0 },
      uCctv: { value: 0 },
      uStatic: { value: 0 },
      uBlackout: { value: 0 },
      uShock: { value: 0 },
      uQuake: { value: 0 },
      uFlicker: { value: 1 },
      uCrtStrength: { value: 0.55 },
      uMonitorFlash: { value: 0 },
      uRetro: { value: isRetro ? 1.0 : 0.0 },
      uHeat: { value: 0 },
      uSteam: { value: 0 },
      uIrFlash: { value: 0 },
      uLowPower: { value: 0 },
      uFlashlight: { value: 0 },
      uVhsTheme: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uCctv;
      uniform float uStatic;
      uniform float uBlackout;
      uniform float uShock;
      uniform float uQuake;
      uniform float uFlicker;
      uniform float uCrtStrength;
      uniform float uMonitorFlash;
      uniform float uRetro;
      uniform float uHeat;
      uniform float uSteam;
      uniform float uIrFlash;
      uniform float uLowPower;
      uniform float uFlashlight;
      uniform float uVhsTheme;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;

        // Subtle CRT/VHS curvature
        float curve = (uCctv * 0.020 + uRetro * 0.010) * max(0.3, uCrtStrength);
        if (curve > 0.001) {
          vec2 c = uv * 2.0 - 1.0;
          uv += c * dot(c, c) * curve;
        }

        // VHS tape tracking micro-jitter band near bottom + seismic tear
        float trackPos = fract(uTime * 0.14);
        float trackBand = smoothstep(0.035, 0.0, abs(uv.y - trackPos)) * max(uCctv * 0.8, uCrtStrength * 0.45);
        float tear = (hash(vec2(floor(uv.y * 54.0), floor(uTime * 28.0))) - 0.5);
        uv.x += tear * (uQuake * 0.007 + uStatic * 0.016 + trackBand * 0.012);

        // Thermal heat shimmer
        if (uHeat > 0.02) {
          float wave = sin(uv.y * 36.0 - uTime * 6.8) * cos(uv.x * 20.0 + uTime * 4.1);
          uv.x += wave * uHeat * 0.0038;
        }

        // Authentic VHS horizontal chroma bleed (luma sharp, red/blue horizontally smeared)
        float ca = 0.0011 + uShock * 0.009 + uCctv * 0.0022 + uRetro * 0.0012 + uCrtStrength * 0.0008;
        vec3 centerSample = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
        float rBleed = (
          texture2D(tDiffuse, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r +
          texture2D(tDiffuse, clamp(uv + vec2(ca * 2.1, 0.0), 0.001, 0.999)).r
        ) * 0.5;
        float bBleed = (
          texture2D(tDiffuse, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b +
          texture2D(tDiffuse, clamp(uv - vec2(ca * 2.1, 0.0), 0.001, 0.999)).b
        ) * 0.5;
        vec3 col = vec3(mix(centerSample.r, rBleed, 0.72), centerSample.g, mix(centerSample.b, bBleed, 0.72));

        // Soft highlight bloom on IR eye-shine, CRTs, and emergency LEDs
        vec3 bloomSample = (
          texture2D(tDiffuse, clamp(uv + vec2(0.004, 0.003), 0.001, 0.999)).rgb +
          texture2D(tDiffuse, clamp(uv + vec2(-0.004, -0.003), 0.001, 0.999)).rgb
        ) * 0.5;
        vec3 bright = max(bloomSample - vec3(0.70), vec3(0.0));
        col += bright * (0.34 + uCctv * 0.18 + uIrFlash * 0.30);

        // Tactical Flashlight radial cone falloff boost
        if (uFlashlight > 0.01) {
          vec2 fc = (vUv - vec2(0.5, 0.5)) * vec2(1.45, 1.0);
          float cone = smoothstep(0.62, 0.06, length(fc));
          float ring = smoothstep(0.54, 0.44, length(fc)) * smoothstep(0.32, 0.44, length(fc));
          col *= mix(0.86, 1.24, cone * uFlashlight);
          col += vec3(0.05, 0.055, 0.065) * ring * uFlashlight;
        }

        // Office flicker & Blackout
        col *= mix(1.0, uFlicker, 0.26);
        col *= (1.0 - uBlackout);

        // Cosmetic VHS Theme Grading
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        if (uVhsTheme > 0.5 && uVhsTheme < 1.5) {
          // 1: 1998 Camcorder NightShot Green
          col = mix(col * 0.35, vec3(lum * 0.48, lum * 1.12, lum * 0.62), 0.78);
        } else if (uVhsTheme >= 1.5 && uVhsTheme < 2.5) {
          // 2: Cold Bleach Bypass
          vec3 desat = mix(vec3(lum), col, 0.34);
          col = clamp((desat - 0.12) * 1.22 + vec3(0.01, 0.02, 0.035), 0.0, 1.0);
        } else if (uVhsTheme >= 2.5) {
          // 3: PSX 1997 Ordered Dither + 15-bit Quantization
          vec2 pix = floor(gl_FragCoord.xy * 0.5);
          float bayer = fract(dot(mod(pix, 2.0), vec2(0.5, 0.25)));
          col = floor(col * 24.0 + bayer - 0.35) / 24.0;
        }

        // CCTV Night-Vision Grading + Scanlines + IR Strobe
        if (uCctv > 0.5) {
          float cLum = dot(col, vec3(0.30, 0.58, 0.12));
          vec3 tint = mix(col * 0.65, vec3(cLum * 0.76, cLum * 0.98, cLum * 0.88), 0.72);
          float scanAmt = 0.09 * uCrtStrength;
          float scan = (1.0 - scanAmt) + scanAmt * sin(vUv.y * 360.0 + uTime * 8.0);
          col = tint * scan + vec3(0.05, 0.07, 0.06) * trackBand;
          if (uIrFlash > 0.01) {
            col += vec3(0.42, 0.95, 0.82) * uIrFlash * 0.58;
          }
        } else if (uCrtStrength > 0.01) {
          float scan = 1.0 - (0.024 * uCrtStrength) + (0.024 * uCrtStrength) * sin(vUv.y * 290.0);
          col *= scan;
        }

        // Steam condensation mist
        vec2 d = vUv - 0.5;
        if (uSteam > 0.01) {
          float mistMask = smoothstep(0.16, 0.72, length(d * vec2(1.1, 1.25)));
          float swirl = 0.5 + 0.5 * sin(vUv.x * 9.0 + uTime * 1.6) * cos(vUv.y * 7.0 - uTime * 1.2);
          vec3 mistColor = uCctv > 0.5 ? vec3(0.50, 0.68, 0.64) : vec3(0.68, 0.66, 0.62);
          col = mix(col, mistColor, clamp(uSteam * mistMask * (0.28 + swirl * 0.24), 0.0, 0.54));
        }

        // Low-Power / Breaker-Tripped emergency red edge pulse
        float edgeFactor = smoothstep(0.26, 0.78, length(d * vec2(1.18, 1.12)));
        if (uLowPower > 0.01) {
          float pulse = 0.5 + 0.5 * sin(uTime * 4.8);
          col += vec3(0.28, 0.02, 0.03) * edgeFactor * uLowPower * (0.35 + 0.65 * pulse);
        }

        // Analog VHS noise grain
        vec2 noiseRes = (uRetro > 0.5 || uVhsTheme >= 2.5) ? vec2(260.0, 150.0) : vec2(480.0, 270.0);
        float snow = hash(floor(vUv * noiseRes) + fract(uTime * 19.37));
        float grainAmt = (0.022 + uCctv * 0.048 + uRetro * 0.028) * max(0.28, uCrtStrength);
        col += vec3((snow - 0.5) * grainAmt);

        if (uStatic > 0.01) {
          float bandMask = step(0.68, hash(vec2(floor(vUv.y * 34.0), floor(uTime * 22.0))));
          col = mix(col, vec3(snow * 0.85), clamp(uStatic * (0.42 + bandMask * 0.45), 0.0, 0.92));
        }

        if (uMonitorFlash > 0.01) {
          float distY = abs(vUv.y - 0.5);
          float beam = exp(-distY * (18.0 + (1.0 - uMonitorFlash) * 28.0)) * uMonitorFlash;
          col += vec3(0.55, 0.88, 0.80) * beam * 0.68;
        }

        col += vec3(0.30, 0.02, 0.03) * uShock * 0.44;

        // Deep atmospheric vignette
        float vig = smoothstep(0.96, 0.26, length(d * vec2(1.20, 1.14)));
        col *= mix(0.24, 1.0, vig);

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `,
  });
}
