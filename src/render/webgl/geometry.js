import { mat3, vec3 } from 'gl-matrix';

export class BufferAttribute {
  constructor(array, itemSize) {
    this.array = array;
    this.itemSize = itemSize;
    this.count = array.length / itemSize;
  }
  getY(i) { return this.array[i * this.itemSize + 1]; }
  getZ(i) { return this.array[i * this.itemSize + 2]; }
  setZ(i, value) { this.array[i * this.itemSize + 2] = value; }
}
export class Float32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Float32Array(array), itemSize); }
}

export class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.index = null;
  }
  setAttribute(name, attribute) { this.attributes[name] = attribute; }
  setIndex(indices) { this.index = indices; }
  copyVertices(indices) {
    const geometry = new BufferGeometry();
    for (const [name, { array, itemSize }] of Object.entries(this.attributes)) {
      const values = indices ? new Float32Array(indices.length * itemSize) : array.slice();
      if (indices) indices.forEach((index, i) => {
        for (let j = 0; j < itemSize; j++) values[i * itemSize + j] = array[index * itemSize + j];
      });
      geometry.setAttribute(name, new BufferAttribute(values, itemSize));
    }
    return geometry;
  }
  clone() { return this.copyVertices(); }
  toNonIndexed() { return this.copyVertices(this.index); }

  computeVertexNormals() {
    const { array: positions } = this.attributes.position;
    const normals = new Float32Array(positions.length);
    const ab = vec3.create();
    const ac = vec3.create();
    const normal = vec3.create();
    for (let offset = 0; offset < positions.length; offset += 9) {
      for (let axis = 0; axis < 3; axis++) {
        ab[axis] = positions[offset + 3 + axis] - positions[offset + axis];
        ac[axis] = positions[offset + 6 + axis] - positions[offset + axis];
      }
      vec3.normalize(normal, vec3.cross(normal, ab, ac));
      for (let i = 0; i < 3; i++) normals.set(normal, offset + i * 3);
    }
    this.setAttribute('normal', new BufferAttribute(normals, 3));
  }

  applyMatrix4(matrix) {
    const normalMatrix = mat3.normalFromMat4(mat3.create(), matrix);
    const point = vec3.create();
    for (const name of ['position', 'normal']) {
      const attr = this.attributes[name];
      if (!attr) continue;
      const values = attr.array;
      for (let i = 0; i < values.length; i += 3) {
        vec3.set(point, values[i], values[i + 1], values[i + 2]);
        if (name === 'position') vec3.transformMat4(point, point, matrix);
        else if (normalMatrix) vec3.normalize(point, vec3.transformMat3(point, point, normalMatrix));
        values.set(point, i);
      }
    }
    this.cachedBounds = null;
  }

  bounds() {
    if (this.cachedBounds) return this.cachedBounds;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const { array } = this.attributes.position;
    for (let i = 0; i < array.length; i++) {
      const axis = i % 3;
      min[axis] = Math.min(min[axis], array[i]);
      max[axis] = Math.max(max[axis], array[i]);
    }
    return this.cachedBounds = { min, max, center: min.map((n, i) => (n + max[i]) / 2), radius: Math.hypot(...max.map((n, i) => (n - min[i]) / 2)) };
  }
}

export function mergeGeometries(parts) {
  const merged = new BufferGeometry();
  for (const [name, { itemSize }] of Object.entries(parts[0].attributes)) {
    const values = new Float32Array(parts.reduce((sum, geo) => sum + geo.attributes[name].array.length, 0));
    let offset = 0;
    for (const geo of parts) {
      values.set(geo.attributes[name].array, offset);
      offset += geo.attributes[name].array.length;
    }
    merged.setAttribute(name, new BufferAttribute(values, itemSize));
  }
  return merged;
}

function mesh() {
  const points = [];
  const texcoords = [];
  return {
    triangle(a, b, c, uv = [[0, 0], [1, 0], [1, 1]]) {
      points.push(...a, ...b, ...c);
      texcoords.push(...uv.flat());
    },
    quad(a, b, c, d, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      this.triangle(a, b, c, [uv[0], uv[1], uv[2]]);
      this.triangle(a, c, d, [uv[0], uv[2], uv[3]]);
    },
    finish(geometry) {
      geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
      geometry.setAttribute('uv', new Float32BufferAttribute(texcoords, 2));
      geometry.computeVertexNormals();
    },
  };
}

export class BoxGeometry extends BufferGeometry {
  constructor(w, h, d) {
    super();
    const x = w / 2, y = h / 2, z = d / 2;
    const b = mesh();
    b.quad([-x,-y,z], [x,-y,z], [x,y,z], [-x,y,z]);
    b.quad([x,-y,-z], [-x,-y,-z], [-x,y,-z], [x,y,-z]);
    b.quad([-x,-y,-z], [-x,-y,z], [-x,y,z], [-x,y,-z]);
    b.quad([x,-y,z], [x,-y,-z], [x,y,-z], [x,y,z]);
    b.quad([-x,y,z], [x,y,z], [x,y,-z], [-x,y,-z]);
    b.quad([-x,-y,-z], [x,-y,-z], [x,-y,z], [-x,-y,z]);
    b.finish(this);
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(top, bottom, height, sides) {
    super();
    const b = mesh();
    const point = (i, r, y) => [Math.sin(i * Math.PI * 2 / sides) * r, y, Math.cos(i * Math.PI * 2 / sides) * r];
    for (let i = 0; i < sides; i++) {
      const u = i / sides, v = (i + 1) / sides;
      const a = point(i, bottom, -height / 2), c = point(i + 1, top, height / 2);
      const next = point(i + 1, bottom, -height / 2), upper = point(i, top, height / 2);
      b.quad(a, next, c, upper, [[u,0], [v,0], [v,1], [u,1]]);
      if (bottom) b.triangle([0, -height / 2, 0], next, a);
      if (top) b.triangle([0, height / 2, 0], upper, c);
    }
    b.finish(this);
  }
}

export class ConeGeometry extends CylinderGeometry {
  constructor(radius, height, sides) { super(0, radius, height, sides); }
}

function surface(geometry, columns, rows, point) {
  const b = mesh();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const u = x / columns, v = y / rows;
      const nextU = (x + 1) / columns, nextV = (y + 1) / rows;
      b.quad(point(u, v), point(nextU, v), point(nextU, nextV), point(u, nextV),
        [[u,1-v], [nextU,1-v], [nextU,1-nextV], [u,1-nextV]]);
    }
  }
  b.finish(geometry);
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius, sides, rows, phi = 0, phiLength = Math.PI * 2, theta = 0, thetaLength = Math.PI) {
    super();
    surface(this, sides, rows, (u, v) => {
      const longitude = phi + u * phiLength;
      const latitude = theta + v * thetaLength;
      const ring = radius * Math.sin(latitude);
      return [Math.cos(longitude) * ring, Math.cos(latitude) * radius, Math.sin(longitude) * ring];
    });
  }
}
export class TorusGeometry extends BufferGeometry {
  constructor(radius, tube, rows, sides) {
    super();
    surface(this, sides, rows, (u, v) => {
      const angle = u * Math.PI * 2;
      const cross = v * Math.PI * 2;
      const ring = radius + tube * Math.cos(cross);
      return [ring * Math.cos(angle), ring * Math.sin(angle), tube * Math.sin(cross)];
    });
  }
}
export class IcosahedronGeometry extends SphereGeometry {
  constructor(radius) { super(radius, 10, 6); }
}

export class OctahedronGeometry extends SphereGeometry {
  constructor(radius) { super(radius, 4, 2); }
}

export class RoundedBoxGeometry extends BufferGeometry {
  constructor(w, h, d, radius, segments) {
    super();
    const outline = (width, height, r, z) => {
      const ring = [];
      for (let corner = 0; corner < 4; corner++) {
        const mid = corner * Math.PI / 2 + Math.PI / 4;
        const x = Math.sign(Math.cos(mid)) * (width / 2 - r);
        const y = Math.sign(Math.sin(mid)) * (height / 2 - r);
        for (let step = 0; step <= segments; step++) {
          const angle = (corner + step / segments) * Math.PI / 2;
          ring.push([x + r * Math.cos(angle), y + r * Math.sin(angle), z]);
        }
      }
      return ring;
    };
    const rings = [
      outline(w - radius, h - radius, radius * 0.5, -d / 2),
      outline(w, h, radius, -d / 2 + radius),
      outline(w, h, radius, d / 2 - radius),
      outline(w - radius, h - radius, radius * 0.5, d / 2),
    ];
    const b = mesh();
    for (let i = 0; i < rings[0].length; i++) {
      const j = (i + 1) % rings[0].length;
      for (let k = 0; k < rings.length - 1; k++) {
        b.quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]);
      }
      const uv = ([x, y]) => [x / w + 0.5, y / h + 0.5];
      b.triangle([0, 0, -d / 2], rings[0][j], rings[0][i], [[0.5,0.5], uv(rings[0][j]), uv(rings[0][i])]);
      b.triangle([0, 0, d / 2], rings[3][i], rings[3][j], [[0.5,0.5], uv(rings[3][i]), uv(rings[3][j])]);
    }
    b.finish(this);
  }
}
