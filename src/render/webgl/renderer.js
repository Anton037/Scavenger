import { mat3, mat4, vec3 } from 'gl-matrix';
import { AdditiveBlending } from './scene.js';
import { fullscreenVertex, MAX_LIGHTS, sceneVertex, sceneFragment, shadowVertex, shadowFragment } from './lighting.js';

function program(gl, vertex, fragment) {
  const compile = (kind, source) => {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };
  const vertexShader = compile(gl.VERTEX_SHADER, vertex);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
  const handle = gl.createProgram();
  gl.attachShader(handle, vertexShader);
  gl.attachShader(handle, fragmentShader);
  gl.linkProgram(handle);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(handle);
    gl.deleteProgram(handle);
    throw new Error(message);
  }
  const uniforms = {};
  for (let i = 0; i < gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS); i++) {
    const name = gl.getActiveUniform(handle, i).name;
    uniforms[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(handle, name);
  }
  return { handle, uniforms };
}

const SHADOW_SIZE = 384;

const clipPlanes = (matrix) => {
  const planes = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      const plane = [0, 4, 8, 12].map((i) => matrix[i + 3] + sign * matrix[i + axis]);
      const length = Math.hypot(plane[0], plane[1], plane[2]);
      planes.push(plane.map((coefficient) => coefficient / length));
    }
  }
  return planes;
};

export class Renderer {
  constructor(canvas, postFragment) {
    this.canvas = canvas;
    this.postFragment = postFragment;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!this.gl) throw new Error('WebGL 2 wird von diesem Browser nicht unterstützt.');
    this.shadowTransform = mat4.create();
    this.shadowView = mat4.create();
    this.shadowProjection = mat4.create();
    this.casters = [];
    this.viewProjection = mat4.create();
    this.normalMatrix = mat3.create();
    this.center = vec3.create();
    this.positions = new Float32Array(MAX_LIGHTS * 4);
    this.colors = new Float32Array(MAX_LIGHTS * 4);
    this.cones = new Float32Array(MAX_LIGHTS * 4);
    this.falloffs = new Float32Array(MAX_LIGHTS * 2);
    this.opaque = [];
    this.transparent = [];
    this.lights = [];
    this.init();

    canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => this.init());
  }

  init() {
    const gl = this.gl;
    this.meshes = new WeakMap();
    this.textures = new WeakMap();
    this.sceneProgram = program(gl, sceneVertex, sceneFragment);
    this.postProgram = program(gl, fullscreenVertex, this.postFragment);
    this.framebuffer = gl.createFramebuffer();
    this.frameTexture = gl.createTexture();
    this.defaultTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    this.depth = gl.createRenderbuffer();
    this.quad = gl.createVertexArray();
    this.shadowProgram = program(gl, shadowVertex, shadowFragment);
    this.shadowBuffer = gl.createFramebuffer();
    this.shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTexture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.targetWidth = 0;
    this.targetHeight = 0;
    gl.disable(gl.CULL_FACE);
  }

  resize(width, height, renderHeight) {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25,
      Math.sqrt(1450000 / (width * height)), 1.45 * renderHeight / height);
    const outputWidth = Math.round(width * dpr);
    const outputHeight = Math.round(height * dpr);
    if (this.canvas.width !== outputWidth || this.canvas.height !== outputHeight) {
      this.canvas.width = outputWidth;
      this.canvas.height = outputHeight;
    }
    const w = Math.max(1, Math.round(renderHeight * width / height)), h = renderHeight;
    if (w === this.targetWidth && h === this.targetHeight) return;
    this.targetWidth = w;
    this.targetHeight = h;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.frameTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  mesh(geometry) {
    if (this.meshes.has(geometry)) return this.meshes.get(geometry);
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (const [location, name] of ['position', 'normal', 'uv'].entries()) {
      const attr = geometry.attributes[name];
      if (!attr) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, attr.array, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, attr.itemSize, gl.FLOAT, false, 0, 0);
    }
    const mesh = { vao, count: geometry.attributes.position.count };
    this.meshes.set(geometry, mesh);
    return mesh;
  }

  bindTexture(texture, unit) {
    if (!texture?.image) return;
    const gl = this.gl;
    const previous = this.textures.get(texture);
    const gpu = previous || gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gpu);
    if (previous && !texture.needsUpdate) return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const format = texture.colorSpace === 'srgb' ? gl.SRGB8_ALPHA8 : gl.RGBA8;
    if (previous) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    else gl.texImage2D(gl.TEXTURE_2D, 0, format, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    const mipmaps = texture.generateMipmaps && texture.minFilter === 'mipmap';
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    if (!previous) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR :
        texture.minFilter === 'nearest' ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter === 'nearest' ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    }
    texture.needsUpdate = false;
    this.textures.set(texture, gpu);
  }

  collect(node, planes, eye) {
    if (!node.visible) return;
    node.updateMatrix();
    if (node.kind && node.intensity > 0) this.lights.push(node);
    if (node.isMesh && node.material.opacity > 0.003) {
      if (node.castShadow && !node.isPoints) this.casters.push(node);
      const { center, radius } = node.geometry.bounds();
      const m = node.matrixWorld;
      const worldRadius = radius * Math.sqrt(Math.max(
        m[0] ** 2 + m[1] ** 2 + m[2] ** 2,
        m[4] ** 2 + m[5] ** 2 + m[6] ** 2,
        m[8] ** 2 + m[9] ** 2 + m[10] ** 2,
      ));
      const [x, y, z] = vec3.transformMat4(this.center, center, m);
      if (planes.every(([a, b, c, d]) => a * x + b * y + c * z + d >= -worldRadius)) {
        if (node.material.transparent) {
          node.cameraDistance = (eye.x - x) ** 2 + (eye.y - y) ** 2 + (eye.z - z) ** 2;
          this.transparent.push(node);
        } else this.opaque.push(node);
      }
    }
    for (const child of node.children) this.collect(child, planes, eye);
  }

  drawShadow(light) {
    const gl = this.gl;
    const eye = light.matrixWorld.subarray(12, 15);
    const aim = light.target?.position;
    const target = aim ? [aim.x, aim.y, aim.z] : [eye[0], eye[1] - 1, eye[2]];
    const up = aim ? [0, 1, 0] : [0, 0, -1];
    mat4.lookAt(this.shadowView, eye, target, up);
    mat4.perspective(this.shadowProjection, aim ? light.angle * 2 : 2.4, 1, 0.08, light.distance);
    mat4.multiply(this.shadowTransform, this.shadowProjection, this.shadowView);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.shadowProgram.handle);
    const { uniforms } = this.shadowProgram;
    gl.uniformMatrix4fv(uniforms.transform, false, this.shadowTransform);
    for (const node of this.casters) {
      const mesh = this.mesh(node.geometry);
      gl.bindVertexArray(mesh.vao);
      gl.uniformMatrix4fv(uniforms.model, false, node.matrixWorld);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
  }

  uploadLights(uniforms, shadow) {
    const gl = this.gl;
    const ambient = [0.008, 0.010, 0.016];
    let shadowIndex = -1;
    let count = 0;
    for (const light of this.lights) {
      const { rgb } = light.color;
      if (light.kind === 'ambient') {
        for (let i = 0; i < 3; i++) ambient[i] += rgb[i] * light.intensity * 1.1;
        continue;
      }
      if (count >= MAX_LIGHTS) continue;
      if (light === shadow) shadowIndex = count;
      const offset = count * 4;
      const [x, y, z] = light.matrixWorld.subarray(12, 15);
      this.positions.set([x, y, z, light.distance || 0], offset);
      const energy = light.intensity * 0.43;
      this.colors.set([rgb[0] * energy, rgb[1] * energy, rgb[2] * energy, 0], offset);
      if (light.kind === 'spot') {
        const target = light.target.position;
        const length = Math.hypot(target.x - x, target.y - y, target.z - z) || 1;
        this.cones.set([(target.x - x) / length, (target.y - y) / length, (target.z - z) / length, Math.cos(light.angle)], offset);
      } else this.cones[offset + 3] = -1;
      this.falloffs.set([light.decay || 2, Math.cos((light.angle || 0) * (1 - (light.penumbra || 0)))], count * 2);
      count++;
    }
    gl.uniform3fv(uniforms.ambient, ambient);
    gl.uniform1i(uniforms.shadowLight, shadowIndex);
    gl.uniformMatrix4fv(uniforms.shadowTransform, false, this.shadowTransform);
    gl.uniform1i(uniforms.shadowMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.uniform1i(uniforms.lightCount, count);
    gl.uniform4fv(uniforms.lightPosition, this.positions);
    gl.uniform4fv(uniforms.lightColor, this.colors);
    gl.uniform4fv(uniforms.lightCone, this.cones);
    gl.uniform2fv(uniforms.lightFalloff, this.falloffs);
  }

  drawNode(node, u) {
    const gl = this.gl;
    const { material, matrixWorld } = node;
    const mesh = this.mesh(node.geometry);
    gl.bindVertexArray(mesh.vao);
    gl.uniformMatrix4fv(u.model, false, matrixWorld);
    if (mat3.normalFromMat4(this.normalMatrix, matrixWorld)) gl.uniformMatrix3fv(u.normalMatrix, false, this.normalMatrix);
    const [r, g, b] = material.color.rgb;
    gl.uniform4f(u.tint, r, g, b, material.opacity);
    const [er, eg, eb] = material.emissive.rgb;
    const intensity = material.emissiveIntensity ?? 1;
    gl.uniform3f(u.glow, er * intensity, eg * intensity, eb * intensity);
    gl.uniform2f(u.finish, material.roughness, material.metalness);
    gl.uniform1i(u.unlit, Boolean(material.isMeshBasicMaterial));
    gl.uniform1i(u.receivesShadow, node.receiveShadow !== false);
    gl.uniform1i(u.points, Boolean(node.isPoints));
    gl.uniform1f(u.pointSize, (material.size || 0) * this.targetHeight);
    gl.uniform1i(u.mapped, Boolean(material.map?.image));
    gl.uniform1i(u.bumped, Boolean(material.normalMap?.image));
    gl.uniform1i(u.roughMapped, Boolean(material.roughnessMap?.image));
    gl.uniform2f(u.repeatUV, material.map?.repeat.x ?? 1, material.map?.repeat.y ?? 1);
    gl.uniform2f(u.offsetUV, material.map?.offset.x ?? 0, material.map?.offset.y ?? 0);
    this.bindTexture(material.map, 0);
    this.bindTexture(material.normalMap, 1);
    this.bindTexture(material.roughnessMap, 2);
    if (material.transparent) {
      gl.blendFunc(gl.SRC_ALPHA, material.blending === AdditiveBlending ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(material.depthWrite === true);
    }
    gl.drawArrays(node.isPoints ? gl.POINTS : gl.TRIANGLES, 0, mesh.count);
  }

  draw(scene, camera, effects) {
    const gl = this.gl;
    if (gl.isContextLost() || !this.targetWidth) return 0;
    this.lights.length = this.opaque.length = this.transparent.length = this.casters.length = 0;
    const eye = camera.position;
    camera.updateMatrix();
    mat4.invert(camera.view, camera.matrixWorld);
    mat4.multiply(this.viewProjection, camera.projection, camera.view);
    this.collect(scene, clipPlanes(this.viewProjection), eye);
    // The lowest quality tier frees up a full pass when a phone is under load.
    const shadow = this.targetHeight >= 320 ? this.lights.find((light) => light.castShadow) : null;
    if (shadow) this.drawShadow(shadow);
    this.transparent.sort((a, b) => b.cameraDistance - a.cameraDistance);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.targetWidth, this.targetHeight);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const [r, g, b] = scene.background.rgb;
    gl.clearColor(r ** (1 / 2.2), g ** (1 / 2.2), b ** (1 / 2.2), 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const { uniforms: u } = this.sceneProgram;
    gl.useProgram(this.sceneProgram.handle);
    gl.uniformMatrix4fv(u.viewProjection, false, this.viewProjection);
    gl.uniform3f(u.eye, eye.x, eye.y, eye.z);
    gl.uniform4f(u.fog, ...scene.fog.color.rgb, scene.fog.density);
    gl.uniform1i(u.albedoMap, 0);
    gl.uniform1i(u.normalMap, 1);
    gl.uniform1i(u.roughnessMap, 2);
    for (let unit = 0; unit < 3; unit++) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
    }
    this.uploadLights(u, shadow);
    for (const node of this.opaque) this.drawNode(node, u);
    gl.enable(gl.BLEND);
    for (const node of this.transparent) this.drawNode(node, u);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.postProgram.handle);
    gl.bindVertexArray(this.quad);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    for (const [name, { value }] of Object.entries(effects)) {
      if (name !== 'tDiffuse') gl.uniform1f(this.postProgram.uniforms[name], value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.opaque.length + this.transparent.length + (shadow ? this.casters.length : 0) + 1;
  }
}
