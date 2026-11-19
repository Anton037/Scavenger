import * as THREE from 'three';

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
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;

        // Subtle CRT barrel curvature in CCTV mode or Retro mode
        float curve = (uCctv * 0.022 + uRetro * 0.009) * max(0.35, uCrtStrength);
        if (curve > 0.001) {
          vec2 c = uv * 2.0 - 1.0;
          uv += c * dot(c, c) * curve;
        }

        // Thermal fryer heat-haze shimmer when temperature rises!
        if (uHeat > 0.02) {
          float wave = sin(uv.y * 38.0 - uTime * 7.2) * cos(uv.x * 21.0 + uTime * 4.3);
          uv.x += wave * uHeat * 0.0042;
          uv.y += sin(uv.x * 28.0 + uTime * 5.6) * uHeat * 0.0022;
        }

        // Earthquake micro-tear + horror shock chromatic offset
        float tear = (hash(vec2(floor(uv.y * 48.0), floor(uTime * 28.0))) - 0.5);
        uv.x += tear * (uQuake * 0.007 + uStatic * 0.016);

        float ca = 0.0007 + uShock * 0.009 + uCctv * 0.0016 + uRetro * 0.0006 + uHeat * 0.0014;
        vec3 col;
        col.r = texture2D(tDiffuse, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r;
        col.g = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).g;
        col.b = texture2D(tDiffuse, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b;

        // Cinematic highlight bloom lift on neon signs, LEDs, and glowing eyes
        vec3 bloomSample = (
          texture2D(tDiffuse, clamp(uv + vec2(0.004, 0.003), 0.001, 0.999)).rgb +
          texture2D(tDiffuse, clamp(uv + vec2(-0.004, -0.003), 0.001, 0.999)).rgb +
          texture2D(tDiffuse, clamp(uv + vec2(0.004, -0.003), 0.001, 0.999)).rgb +
          texture2D(tDiffuse, clamp(uv + vec2(-0.004, 0.003), 0.001, 0.999)).rgb
        ) * 0.25;
        vec3 bright = max(bloomSample - vec3(0.58), vec3(0.0));
        col += bright * (0.46 + uCctv * 0.20 + uIrFlash * 0.35);

        // Office flicker & Blackout
        col *= mix(1.0, uFlicker, 0.24);
        col *= (1.0 - uBlackout);

        // CCTV cold night-vision grading + scanlines + IR strobe flash
        if (uCctv > 0.5) {
          float lum = dot(col, vec3(0.30, 0.58, 0.12));
          vec3 tint = mix(col * 0.72, vec3(lum * 0.80, lum * 1.02, lum * 0.94), 0.68);
          float scanAmt = 0.09 * uCrtStrength;
          float scan = (1.0 - scanAmt) + scanAmt * sin(vUv.y * 360.0 + uTime * 8.0);
          float bar = smoothstep(0.93, 1.0, sin(vUv.y * 5.0 - uTime * 1.5));
          col = tint * scan + vec3(0.04, 0.075, 0.065) * bar * max(0.3, uCrtStrength);
          if (uIrFlash > 0.01) {
            col += vec3(0.36, 0.95, 0.80) * uIrFlash * 0.58;
          }
        } else if (uCrtStrength > 0.01) {
          float scan = 1.0 - (0.025 * uCrtStrength) + (0.025 * uCrtStrength) * sin(vUv.y * 280.0);
          col *= scan;
        }

        // Warm steam / condensation mist around screen edges when fryer steam builds
        if (uSteam > 0.01) {
          vec2 edge = vUv - 0.5;
          float mistMask = smoothstep(0.16, 0.72, length(edge * vec2(1.1, 1.25)));
          float swirl = 0.5 + 0.5 * sin(vUv.x * 9.0 + uTime * 1.6) * cos(vUv.y * 7.0 - uTime * 1.2);
          vec3 mistColor = uCctv > 0.5 ? vec3(0.56, 0.76, 0.72) : vec3(0.84, 0.72, 0.58);
          col = mix(col, mistColor, clamp(uSteam * mistMask * (0.28 + swirl * 0.24), 0.0, 0.56));
        }

        // Thermal amber edge warning & Low-Power red emergency pulse
        vec2 d = vUv - 0.5;
        float edgeFactor = smoothstep(0.25, 0.78, length(d * vec2(1.18, 1.12)));
        if (uHeat > 0.15) {
          col += vec3(0.36, 0.12, 0.02) * edgeFactor * (uHeat - 0.15) * 0.52;
        }
        if (uLowPower > 0.01) {
          float pulse = 0.5 + 0.5 * sin(uTime * 5.2);
          col += vec3(0.28, 0.02, 0.04) * edgeFactor * uLowPower * (0.35 + 0.65 * pulse);
        }

        // Animated film grain / VHS static snow
        vec2 noiseRes = uRetro > 0.5 ? vec2(260.0, 150.0) : vec2(480.0, 270.0);
        vec2 noiseCell = floor(vUv * noiseRes);
        float snow = hash(noiseCell + fract(uTime * 19.37));
        float grainAmt = (0.020 + uCctv * 0.046 + uRetro * 0.026) * max(0.25, uCrtStrength);
        col += vec3((snow - 0.5) * grainAmt);

        if (uStatic > 0.01) {
          float bandMask = step(0.68, hash(vec2(floor(vUv.y * 34.0), floor(uTime * 22.0))));
          col = mix(col, vec3(snow * 0.88), clamp(uStatic * (0.42 + bandMask * 0.45), 0.0, 0.92));
        }

        // Smooth CRT horizontal power-on beam when flipping monitor
        if (uMonitorFlash > 0.01) {
          float distY = abs(vUv.y - 0.5);
          float beam = exp(-distY * (18.0 + (1.0 - uMonitorFlash) * 28.0)) * uMonitorFlash;
          col += vec3(0.55, 0.92, 0.82) * beam * 0.72;
        }

        // Red shock pulse on window stings & jumpscares
        col += vec3(0.32, 0.02, 0.04) * uShock * 0.46;

        // Deep claustrophobic vignette
        float vig = smoothstep(0.96, 0.28, length(d * vec2(1.18, 1.12)));
        col *= mix(0.30, 1.0, vig);

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `,
  });
}
