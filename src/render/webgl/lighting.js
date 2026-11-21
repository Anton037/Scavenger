export const MAX_LIGHTS = 8;

export const sceneVertex = `#version 300 es
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 texcoord;
uniform mat4 model;
uniform mat4 viewProjection;
uniform mat3 normalMatrix;
uniform float pointSize;
out vec3 worldPosition;
out vec3 worldNormal;
out vec2 uv;
void main() {
  vec4 world = model * vec4(position, 1.0);
  worldPosition = world.xyz;
  worldNormal = normalMatrix * normal;
  uv = texcoord;
  gl_Position = viewProjection * world;
  gl_PointSize = clamp(pointSize / max(0.2, gl_Position.w), 1.0, 14.0);
}`;

export const sceneFragment = `#version 300 es
precision highp float;
in vec3 worldPosition;
in vec3 worldNormal;
in vec2 uv;
out vec4 result;
uniform sampler2D albedoMap;
uniform sampler2D normalMap;
uniform sampler2D roughnessMap;
uniform bool mapped;
uniform bool bumped;
uniform bool roughMapped;
uniform bool unlit;
uniform bool receivesShadow;
uniform bool points;
uniform vec2 repeatUV;
uniform vec2 offsetUV;
uniform mat4 shadowTransform;
uniform highp sampler2DShadow shadowMap;
uniform int shadowLight;
uniform vec4 tint;
uniform vec3 glow;
uniform vec2 finish;
uniform vec3 eye;
uniform vec3 ambient;
uniform vec4 fog;
uniform int lightCount;
uniform vec4 lightPosition[${MAX_LIGHTS}];
uniform vec4 lightColor[${MAX_LIGHTS}];
uniform vec4 lightCone[${MAX_LIGHTS}];
uniform vec2 lightFalloff[${MAX_LIGHTS}];

vec3 surfaceNormal(vec2 coord) {
  vec3 n = normalize(worldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  if (!bumped) return n;
  vec3 dx = dFdx(worldPosition);
  vec3 dy = dFdy(worldPosition);
  vec2 ux = dFdx(coord);
  vec2 uy = dFdy(coord);
  vec3 tangent = dx * uy.y - dy * ux.y;
  float det = ux.x * uy.y - ux.y * uy.x;
  if (abs(det) < 0.0000001) return n;
  tangent = normalize(tangent * sign(det));
  vec3 sampled = texture(normalMap, coord).rgb * 2.0 - 1.0;
  vec3 bitangent = normalize(cross(n, tangent)) * sign(det);
  return normalize(mat3(tangent, bitangent, n) * vec3(sampled.xy * 0.45, sampled.z));
}

float shadowAt(vec3 normal, vec3 light) {
  vec4 clip = shadowTransform * vec4(worldPosition + normal * 0.014, 1.0);
  if (clip.w <= 0.0) return 1.0;
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  if (any(lessThanEqual(coord, vec3(0.0))) || any(greaterThanEqual(coord, vec3(1.0)))) return 1.0;
  coord.z -= mix(0.0028, 0.0008, max(dot(normal, light), 0.0));
  return mix(0.22, 1.0, texture(shadowMap, coord));
}

void main() {
  vec2 coord = uv * repeatUV + offsetUV;
  vec4 base = tint;
  if (mapped) base *= texture(albedoMap, coord);
  if (points) base.a *= 1.0 - smoothstep(0.12, 0.5, distance(gl_PointCoord, vec2(0.5)));
  if (base.a < 0.004) discard;

  vec3 color = base.rgb;
  vec3 toEye = eye - worldPosition;
  if (!unlit) {
    vec3 n = surfaceNormal(coord);
    vec3 v = normalize(toEye);
    float rough = finish.x;
    if (roughMapped) rough *= texture(roughnessMap, coord).g;
    float shine = mix(96.0, 8.0, clamp(rough, 0.05, 1.0));
    vec3 light = ambient;
    vec3 specular = vec3(0.0);
    for (int i = 0; i < lightCount; i++) {
      vec3 offset = lightPosition[i].xyz - worldPosition;
      float distanceToLight = length(offset);
      vec3 l = offset / max(distanceToLight, 0.001);
      float range = lightPosition[i].w;
      float facing = max(dot(n, l), 0.0);
      if (facing <= 0.0 || (range > 0.0 && distanceToLight >= range)) continue;
      float cutoff = range > 0.0 ? 1.0 - smoothstep(range * 0.65, range, distanceToLight) : 1.0;
      float cone = lightCone[i].w < 0.0 ? 1.0 :
        smoothstep(lightCone[i].w, lightFalloff[i].y, dot(-l, lightCone[i].xyz));
      if (cone <= 0.0) continue;
      float power = cutoff * cone / (1.0 + pow(distanceToLight, lightFalloff[i].x));
      vec3 radiance = lightColor[i].rgb * power;
      if (receivesShadow && i == shadowLight) radiance *= shadowAt(n, l);
      light += radiance * facing;
      specular += radiance * facing * pow(max(dot(n, normalize(l + v)), 0.0), shine);
    }
    color = base.rgb * light * (1.0 - finish.y * 0.28)
      + specular * mix(vec3(0.08), base.rgb, finish.y) + glow;
    color = color / (1.0 + color * 0.55);
  }

  float dist = length(toEye) * fog.a;
  color = mix(fog.rgb, color, exp(-dist * dist));
  // The post pass works in display space, where scanlines and bloom thresholds are defined.
  result = vec4(pow(max(color, vec3(0.0)), vec3(1.0 / 2.2)), base.a);
}`;

export const fullscreenVertex = `#version 300 es
out vec2 vUv;
void main() {
  vUv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
}`;

export const shadowVertex = `#version 300 es
layout(location=0) in vec3 position;
uniform mat4 transform;
uniform mat4 model;
void main() {
  gl_Position = transform * model * vec4(position, 1.0);
}
`;

export const shadowFragment = `#version 300 es
precision mediump float;
void main() {}
`;
