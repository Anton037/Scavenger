import { mat4, vec3 } from 'gl-matrix';

export class Vector2 {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
}

export class Vector3 extends Vector2 {
  constructor(x = 0, y = 0, z = 0) { super(x, y); this.z = z; }
  set(x, y, z) { super.set(x, y); this.z = z; return this; }
  setScalar(n) { return this.set(n, n, n); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  addScaledVector(v, n) { return this.set(this.x + v.x * n, this.y + v.y * n, this.z + v.z * n); }
  lerp(v, t) { return this.set(lerp(this.x, v.x, t), lerp(this.y, v.y, t), lerp(this.z, v.z, t)); }
}

export const lerp = (a, b, t) => a + (b - a) * t;

export class Group {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.rotation.order = 'XYZ';
    this.scale = new Vector3(1, 1, 1);
    this.matrixWorld = mat4.create();
    this.children = [];
    this.userData = {};
    this.visible = true;
    this.parent = null;
  }

  add(...nodes) {
    for (const node of nodes) {
      if (node.parent) node.parent.remove(node);
      this.children.push(node);
      node.parent = this;
    }
  }

  remove(node) {
    const index = this.children.indexOf(node);
    if (index >= 0) {
      this.children.splice(index, 1);
      node.parent = null;
    }
  }

  traverse(visit) {
    visit(this);
    for (const node of this.children) node.traverse(visit);
  }

  updateMatrix() {
    const matrix = this.matrixWorld;
    const { position, rotation, scale } = this;
    mat4.identity(matrix);
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
    if (rotation.order === 'YXZ') {
      if (rotation.y) mat4.rotateY(matrix, matrix, rotation.y);
      if (rotation.x) mat4.rotateX(matrix, matrix, rotation.x);
    } else {
      if (rotation.x) mat4.rotateX(matrix, matrix, rotation.x);
      if (rotation.y) mat4.rotateY(matrix, matrix, rotation.y);
    }
    if (rotation.z) mat4.rotateZ(matrix, matrix, rotation.z);
    for (let i = 0; i < 3; i++) {
      matrix[i] *= scale.x;
      matrix[4 + i] *= scale.y;
      matrix[8 + i] *= scale.z;
    }
    if (this.parent) mat4.multiply(matrix, this.parent.matrixWorld, matrix);
  }

  updateMatrixWorld() {
    this.updateMatrix();
    for (const node of this.children) node.updateMatrixWorld();
  }
}

const linear = (n) => n < 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;

export class Color {
  constructor(hex = 0xffffff) {
    this.rgb = new Float32Array(3);
    this.setHex(hex);
  }

  setHex(hex) {
    this.rgb[0] = linear(((hex >> 16) & 255) / 255);
    this.rgb[1] = linear(((hex >> 8) & 255) / 255);
    this.rgb[2] = linear((hex & 255) / 255);
    this.hex = hex;
  }
}

export class Scene extends Group {}
export class FogExp2 {
  constructor(color, density) {
    this.color = new Color(color);
    this.density = density;
  }
}

class Light extends Group {
  constructor(kind, color, intensity, distance = 0, decay = 2) {
    super();
    Object.assign(this, { kind, color: new Color(color), intensity, distance, decay });
  }
}
export class AmbientLight extends Light {
  constructor(color, intensity) { super('ambient', color, intensity); }
}
export class PointLight extends Light {
  constructor(color, intensity, distance, decay) { super('point', color, intensity, distance, decay); }
}
export class SpotLight extends Light {
  constructor(color, intensity, distance, angle, penumbra, decay) {
    super('spot', color, intensity, distance, decay);
    Object.assign(this, { angle, penumbra, target: new Group() });
  }
}

export class PerspectiveCamera extends Group {
  constructor(fov, aspect, near, far) {
    super();
    Object.assign(this, { fov, aspect, near, far, projection: mat4.create(), view: mat4.create() });
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projection, this.fov * Math.PI / 180, this.aspect, this.near, this.far);
  }

  lookAt(x, y, z) {
    const dx = x - this.position.x;
    const dy = y - this.position.y;
    const dz = z - this.position.z;
    this.rotation.set(Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(-dx, -dz), 0);
  }

  getWorldDirection(out) {
    this.updateMatrix();
    return out.set(-this.matrixWorld[8], -this.matrixWorld[9], -this.matrixWorld[10]);
  }
}

function intersectTriangles(geometry, origin, direction) {
  const { array } = geometry.attributes.position;
  const edge1 = vec3.create(), edge2 = vec3.create(), p = vec3.create(), q = vec3.create(), t = vec3.create();
  let nearest = Infinity;
  for (let i = 0; i < array.length; i += 9) {
    for (let axis = 0; axis < 3; axis++) {
      edge1[axis] = array[i + 3 + axis] - array[i + axis];
      edge2[axis] = array[i + 6 + axis] - array[i + axis];
      t[axis] = origin[axis] - array[i + axis];
    }
    const determinant = vec3.dot(edge1, vec3.cross(p, direction, edge2));
    if (Math.abs(determinant) < 1e-7) continue;
    const u = vec3.dot(t, p) / determinant;
    if (u < 0 || u > 1) continue;
    vec3.cross(q, t, edge1);
    const v = vec3.dot(direction, q) / determinant;
    if (v < 0 || u + v > 1) continue;
    const distance = vec3.dot(edge2, q) / determinant;
    if (distance >= 0) nearest = Math.min(distance, nearest);
  }
  return nearest;
}

export class Raycaster {
  setFromCamera(ndc, camera) {
    camera.updateMatrix();
    this.origin = [camera.position.x, camera.position.y, camera.position.z];
    this.direction = vec3.transformMat3(vec3.create(), [
      ndc.x / camera.projection[0], ndc.y / camera.projection[5], -1,
    ], [
      ...camera.matrixWorld.subarray(0, 3),
      ...camera.matrixWorld.subarray(4, 7),
      ...camera.matrixWorld.subarray(8, 11),
    ]);
  }

  intersectObjects(roots) {
    const hits = [];
    const inverse = mat4.create();
    const origin = vec3.create();
    const direction = vec3.create();
    const endpoint = vec3.add(vec3.create(), this.origin, this.direction);
    const check = (object) => {
      if (!object.visible || !object.isMesh || !mat4.invert(inverse, object.matrixWorld)) return;
      vec3.transformMat4(origin, this.origin, inverse);
      vec3.transformMat4(direction, endpoint, inverse);
      vec3.subtract(direction, direction, origin);
      const { min, max } = object.geometry.bounds();
      let entry = 0;
      let exit = Infinity;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(direction[axis]) < 1e-7) {
          if (origin[axis] < min[axis] || origin[axis] > max[axis]) return;
          continue;
        }
        const near = (min[axis] - origin[axis]) / direction[axis];
        const far = (max[axis] - origin[axis]) / direction[axis];
        entry = Math.max(entry, Math.min(near, far));
        exit = Math.min(exit, Math.max(near, far));
        if (entry > exit) return;
      }
      const distance = intersectTriangles(object.geometry, origin, direction);
      if (Number.isFinite(distance)) hits.push({ object, distance });
    };
    for (const root of roots) root.traverse(check);
    return hits.sort((a, b) => a.distance - b.distance);
  }
}

export const SRGBColorSpace = 'srgb';
export const LinearFilter = 'linear';
export const LinearMipmapLinearFilter = 'mipmap';
export const NearestFilter = 'nearest';
export const RepeatWrapping = 'repeat';
export const AdditiveBlending = 'add';

export class Texture {
  constructor(image = null) {
    this.image = image;
    this.repeat = new Vector2(1, 1);
    this.offset = new Vector2();
    this.needsUpdate = true;
    this.generateMipmaps = true;
  }
}
export { Texture as CanvasTexture };

export class MeshStandardMaterial {
  constructor({ color = 0xffffff, emissive = 0, ...options } = {}) {
    Object.assign(this, { color: new Color(color), emissive: new Color(emissive), opacity: 1, roughness: 0.68, metalness: 0, ...options });
  }
  clone() {
    return new this.constructor({ ...this, color: this.color.hex, emissive: this.emissive.hex });
  }
}

export class MeshBasicMaterial extends MeshStandardMaterial {
  isMeshBasicMaterial = true;
}
export class PointsMaterial extends MeshBasicMaterial {}
export class Mesh extends Group {
  constructor(geometry, material) {
    super();
    Object.assign(this, { geometry, material, isMesh: true });
  }
}
export class Points extends Mesh { isPoints = true; }
