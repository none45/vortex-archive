(function() {
  const CLASS_BY_ID = {
    0: "Workspace",
    1: "Lighting",
    2: "Part",
    3: "Group",
    4: "Folder",
    5: "IntValue",
    6: "StringValue",
    7: "LocalScript",
    8: "Script",
    9: "ModuleScript",
    10: "ReplicatedStorage",
    11: "StarterPlayerScripts",
    12: "ServerScriptService",
    13: "RemoteEvent",
    14: "BindableEvent",
    15: "RemoteFunction",
    16: "BindableFunction"
  };
  const CLASS_ID_BY_NAME = Object.fromEntries(Object.entries(CLASS_BY_ID).map(([id, name]) => [ name, Number(id) ]));
  const SCRIPT_CLASS_IDS = new Set([ 7, 8, 9 ]);
  const NO_PROPERTY_CLASS_IDS = new Set([ 0, 1, 3, 4, 10, 11, 12, 13, 14, 15, 16 ]);
  const MATERIAL_BY_ID = {
    0: "Smooth",
    1: "Smooth",
    2: "Plastic",
    3: "Wood",
    4: "Metal",
    5: "Grass",
    6: "Ice",
    7: "Paint"
  };
  const MATERIAL_ID_BY_NAME = {
    Smooth: 0,
    Plastic: 2,
    Wood: 3,
    Metal: 4,
    Grass: 5,
    Ice: 6,
    Paint: 7
  };
  const FACE_BY_ID = {
    0: "Right",
    1: "Top",
    2: "Back",
    3: "Left",
    4: "Bottom",
    5: "Front"
  };
  const FACE_ID_BY_NAME = {
    Right: 0,
    Top: 1,
    Back: 2,
    Left: 3,
    Bottom: 4,
    Front: 5
  };
  const TEXT_DECODER = new TextDecoder;
  const TEXT_ENCODER = new TextEncoder;
  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  function base64ToBytes(value) {
    if (!value) return new Uint8Array;
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function cloneDoc(doc) {
    return JSON.parse(JSON.stringify(doc));
  }
  function readU64(view, offset) {
    if (typeof view.getBigUint64 === "function") {
      return Number(view.getBigUint64(offset, true));
    }
    const lo = view.getUint32(offset, true);
    const hi = view.getUint32(offset + 4, true);
    return hi * 4294967296 + lo;
  }
  function writeU64Bytes(value) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    if (typeof view.setBigUint64 === "function") {
      view.setBigUint64(0, BigInt(value), true);
    } else {
      const lo = value >>> 0;
      const hi = Math.floor(value / 4294967296) >>> 0;
      view.setUint32(0, lo, true);
      view.setUint32(4, hi, true);
    }
    return bytes;
  }
  function readVec(reader, n) {
    const values = [];
    for (let i = 0; i < n; i++) values.push(reader.f32());
    return values;
  }
  function writeVec(writer, value, n, field) {
    if (!Array.isArray(value) || value.length !== n) {
      throw new Error(field + " must be an array of " + n + " numbers");
    }
    value.forEach(v => writer.f32(v));
  }
  function materialName(value) {
    if (typeof value === "string" && MATERIAL_ID_BY_NAME[value] !== undefined) return value;
    if (typeof value === "number" && MATERIAL_BY_ID[value] !== undefined) return MATERIAL_BY_ID[value];
    return "Unknown(" + String(value) + ")";
  }
  function materialId(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && MATERIAL_ID_BY_NAME[value] !== undefined) return MATERIAL_ID_BY_NAME[value];
    const match = typeof value === "string" && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error("Unknown material: " + String(value));
  }
  function faceName(value) {
    if (typeof value === "string" && FACE_ID_BY_NAME[value] !== undefined) return value;
    if (typeof value === "number" && FACE_BY_ID[value] !== undefined) return FACE_BY_ID[value];
    return "Unknown(" + String(value) + ")";
  }
  function faceId(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && FACE_ID_BY_NAME[value] !== undefined) return FACE_ID_BY_NAME[value];
    const match = typeof value === "string" && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error("Unknown face: " + String(value));
  }
  function className(value) {
    if (typeof value === "string" && CLASS_ID_BY_NAME[value] !== undefined) return value;
    if (typeof value === "number" && CLASS_BY_ID[value] !== undefined) return CLASS_BY_ID[value];
    return "Unknown(" + String(value) + ")";
  }
  function classId(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && CLASS_ID_BY_NAME[value] !== undefined) return CLASS_ID_BY_NAME[value];
    const match = typeof value === "string" && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error("Unknown class: " + String(value));
  }
  function normalizeDoc(doc) {
    const copy = cloneDoc(doc);
    copy.records = (copy.records || []).map(record => {
      const rec = cloneDoc(record);
      rec.class_id = className(rec.class_id);
      if (rec.body && typeof rec.body === "object") {
        const body = rec.body;
        if (body.material !== undefined) body.material = materialName(body.material);
        if (Array.isArray(body.textures)) {
          body.textures = body.textures.map(texture => ({
            ...texture,
            face: faceName(texture.face)
          }));
        }
      }
      return rec;
    });
    return copy;
  }
  class Reader {
    constructor(data) {
      this.data = data;
      this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      this.pos = 0;
    }
    take(n) {
      if (n < 0 || this.pos + n > this.data.length) {
        throw new Error("unexpected end of file at offset 0x" + this.pos.toString(16));
      }
      const out = this.data.slice(this.pos, this.pos + n);
      this.pos += n;
      return out;
    }
    u8() {
      return this.take(1)[0];
    }
    bo() {
      return !!this.u8();
    }
    u32() {
      const v = this.view.getUint32(this.pos, true);
      this.pos += 4;
      return v;
    }
    i32() {
      const v = this.view.getInt32(this.pos, true);
      this.pos += 4;
      return v;
    }
    u64() {
      const v = readU64(this.view, this.pos);
      this.pos += 8;
      return v;
    }
    f32() {
      const v = this.view.getFloat32(this.pos, true);
      this.pos += 4;
      return v;
    }
    string() {
      const len = this.u64();
      const bytes = this.take(len);
      try {
        return TEXT_DECODER.decode(bytes);
      } catch (err) {
        throw new Error("invalid UTF-8 string");
      }
    }
    opt_id() {
      return this.bo() ? this.u64() : null;
    }
  }
  class Writer {
    constructor() {
      this.parts = [];
    }
    bytes(v) {
      this.parts.push(v);
    }
    u8(v) {
      this.bytes(Uint8Array.of(Number(v) & 255));
    }
    bo(v) {
      this.u8(!!v);
    }
    u32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, Number(v), true);
      this.bytes(bytes);
    }
    i32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setInt32(0, Number(v), true);
      this.bytes(bytes);
    }
    u64(v) {
      this.bytes(writeU64Bytes(v));
    }
    f32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setFloat32(0, Number(v), true);
      this.bytes(bytes);
    }
    string(v) {
      const bytes = TEXT_ENCODER.encode(String(v));
      this.u64(bytes.length);
      this.bytes(bytes);
    }
    opt_id(v) {
      this.bo(v !== null && v !== undefined);
      if (v !== null && v !== undefined) this.u64(v);
    }
    output() {
      const total = this.parts.reduce((sum, part) => sum + part.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const part of this.parts) {
        out.set(part, offset);
        offset += part.length;
      }
      return out;
    }
  }
  function nextHeader(data, start) {
    for (let p = start; p <= data.length - 12; p++) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const cls = view.getUint32(p, true);
      if (CLASS_BY_ID[cls] === undefined) continue;
      const nameLen = Number(readU64(view, p + 4));
      if (!(nameLen > 0 && nameLen <= 1e6) || p + 12 + nameLen > data.length) continue;
      try {
        TEXT_DECODER.decode(data.slice(p + 12, p + 12 + nameLen));
      } catch (err) {
        continue;
      }
      return p;
    }
    return null;
  }
  function writeFooterWithCollapsed(base64Value, fieldLabel, n, collapsed) {
    const bytes = base64ToBytes(base64Value || "");
    if (bytes.length !== n) throw new Error(fieldLabel + " must decode to " + n + " bytes");
    if (collapsed !== undefined && collapsed !== null) bytes[bytes.length - 1] = collapsed ? 1 : 0;
    return bytes;
  }
  function readVariableBody(reader, name, remains, cls) {
    const parentId = reader.opt_id();
    const end = remains ? nextHeader(reader.data, reader.pos) : reader.data.length - 57;
    if (end === null || end < reader.pos) {
      throw new Error("cannot find end of record " + JSON.stringify(name));
    }
    const raw = reader.take(end - reader.pos);
    const collapsed = raw.length ? !!raw[raw.length - 1] : undefined;
    const body = {
      parent_id: parentId
    };
    if (collapsed !== undefined) body.collapsed = collapsed;
    if (NO_PROPERTY_CLASS_IDS.has(cls)) {
      body.footer = bytesToBase64(raw);
    } else {
      body.raw_body = bytesToBase64(raw);
    }
    return body;
  }
  function readLight(reader, spot) {
    const out = {
      color: readVec(reader, 4),
      intensity: reader.f32(),
      range: reader.f32()
    };
    if (spot) {
      out.fov = reader.f32();
      out.face = faceName(reader.u32());
    }
    return out;
  }
  function writeLight(writer, value, spot) {
    writeVec(writer, value.color, 4, "light.color");
    writer.f32(value.intensity);
    writer.f32(value.range);
    if (spot) {
      writer.f32(value.fov);
      writer.u32(faceId(value.face));
    }
  }
  function readPart(reader) {
    const body = {
      parent_id: reader.opt_id(),
      display_name: reader.bo() ? reader.string() : null,
      position: readVec(reader, 3),
      rotation: readVec(reader, 4),
      size: readVec(reader, 3),
      color: readVec(reader, 4),
      material: materialName(reader.u32())
    };
    body.prefix = bytesToBase64(reader.take(1));
    for (const key of [ "cast_shadow", "anchored", "can_collide", "spawn_location", "locked", "custom_appearance", "truss" ]) {
      body[key] = reader.bo();
    }
    const count = reader.u64();
    if (count > 1e6) throw new Error("unreasonable texture count: " + count);
    body.textures = [];
    for (let i = 0; i < count; i++) {
      body.textures.push({
        face: faceName(reader.u32()),
        kind: reader.u32()
      });
    }
    body.point_light = reader.bo() ? readLight(reader, false) : null;
    body.spot_light = reader.bo() ? readLight(reader, true) : null;
    const footer = reader.take(12);
    body.collapsed = !!footer[footer.length - 1];
    body.footer = bytesToBase64(footer);
    return body;
  }
  function writePart(writer, body) {
    writer.opt_id(body.parent_id);
    writer.bo(body.display_name !== null && body.display_name !== undefined);
    if (body.display_name !== null && body.display_name !== undefined) writer.string(body.display_name);
    for (const [key, n] of [ [ "position", 3 ], [ "rotation", 4 ], [ "size", 3 ], [ "color", 4 ] ]) {
      writeVec(writer, body[key], n, key);
    }
    writer.u32(materialId(body.material));
    writer.bytes(base64ToBytes(body.prefix || ""));
    for (const key of [ "cast_shadow", "anchored", "can_collide", "spawn_location", "locked", "custom_appearance", "truss" ]) {
      writer.bo(!!body[key]);
    }
    const textures = body.textures || [];
    writer.u64(textures.length);
    for (const texture of textures) {
      writer.u32(faceId(texture.face));
      writer.u32(texture.kind);
    }
    writer.bo(body.point_light !== null && body.point_light !== undefined);
    if (body.point_light !== null && body.point_light !== undefined) writeLight(writer, body.point_light, false);
    writer.bo(body.spot_light !== null && body.spot_light !== undefined);
    if (body.spot_light !== null && body.spot_light !== undefined) writeLight(writer, body.spot_light, true);
    writer.bytes(writeFooterWithCollapsed(body.footer || "", "part.footer", 12, body.collapsed));
  }
  function readRecord(reader, remains) {
    const cls = reader.u32();
    const name = reader.string();
    let body;
    if (cls === 2) {
      body = readPart(reader);
    } else if (SCRIPT_CLASS_IDS.has(cls)) {
      body = {
        parent_id: reader.opt_id(),
        unknown_prefix: bytesToBase64(reader.take(3)),
        source: reader.bo() ? reader.string() : null
      };
      const end = remains ? nextHeader(reader.data, reader.pos) : reader.data.length - 57;
      if (end === null || end < reader.pos) {
        throw new Error("cannot find record after Script " + JSON.stringify(name));
      }
      const tail = reader.take(end - reader.pos);
      body.collapsed = tail.length ? !!tail[tail.length - 1] : null;
      body.tail = bytesToBase64(tail);
    } else {
      body = readVariableBody(reader, name, remains, cls);
    }
    return {
      class_id: className(cls),
      name: name,
      body: body
    };
  }
  function writeRecord(writer, record) {
    const cls = classId(record.class_id);
    const body = record.body || {};
    writer.u32(cls);
    writer.string(record.name);
    if (cls === 2) {
      writePart(writer, body);
    } else if (SCRIPT_CLASS_IDS.has(cls)) {
      writer.opt_id(body.parent_id);
      writer.bytes(base64ToBytes(body.unknown_prefix || ""));
      writer.bo(body.source !== null && body.source !== undefined);
      if (body.source !== null && body.source !== undefined) writer.string(body.source);
      writer.bytes(base64ToBytes(body.tail || ""));
    } else {
      writer.opt_id(body.parent_id);
      writer.bytes(base64ToBytes(body.footer !== undefined ? body.footer : body.raw_body || ""));
    }
  }
  function decodePayload(payload, compression) {
    const reader = new Reader(payload);
    const result = {
      format: "nvtjson",
      format_version: 1,
      compression: compression,
      version: reader.u8(),
      project_id: reader.string()
    };
    const count = reader.u64();
    result.records = [];
    for (let i = 0; i < count; i++) {
      result.records.push(readRecord(reader, count - i - 1));
    }
    result.lighting = {
      ambient_color: readVec(reader, 4),
      brightness: reader.f32(),
      sun_color: readVec(reader, 4),
      sun_illuminance: reader.f32(),
      sun_shadow_maps_enabled: reader.bo(),
      sun_direction: readVec(reader, 4)
    };
    if (reader.pos !== payload.length) {
      result.trailing_bytes = bytesToBase64(reader.take(payload.length - reader.pos));
    }
    return normalizeDoc(result);
  }
  function encodePayload(doc) {
    if (doc.format !== "nvtjson") throw new Error("not a nvtjson document");
    const writer = new Writer;
    writer.u8(doc.version);
    writer.string(doc.project_id);
    const records = doc.records || [];
    writer.u64(records.length);
    for (const record of records) writeRecord(writer, record);
    const light = doc.lighting;
    if (!light) throw new Error("lighting is required");
    writeVec(writer, light.ambient_color, 4, "lighting.ambient_color");
    writer.f32(light.brightness);
    writeVec(writer, light.sun_color, 4, "lighting.sun_color");
    writer.f32(light.sun_illuminance);
    writer.bo(light.sun_shadow_maps_enabled);
    if (light.sun_direction) {
      writeVec(writer, light.sun_direction, 4, "lighting.sun_direction");
    } else {
      writer.bytes(base64ToBytes(doc.unknown_quat || ""));
    }
    writer.bytes(base64ToBytes(doc.trailing_bytes || ""));
    return writer.output();
  }
  let zstdPromise = null;
  async function loadZstd() {
    if (!zstdPromise) {
      zstdPromise = import("/vortex-archive/zstd-bundle.js").then(async mod => {
        await mod.init();
        return {
          compress: mod.compress,
          decompress: mod.decompress
        };
      }).catch(err => {
        zstdPromise = null;
        throw err;
      });
    }
    return zstdPromise;
  }
  function startsWithVrtx(bytes) {
    return bytes.length >= 5 && bytes[0] === 86 && bytes[1] === 82 && bytes[2] === 84 && bytes[3] === 88;
  }
  async function decodeVrtxFile(bytes) {
    let payload = bytes;
    let compression = {
      kind: "raw"
    };
    if (startsWithVrtx(bytes)) {
      if (bytes.length < 6) throw new Error("truncated VRTX wrapper");
      const codec = await loadZstd();
      payload = codec.decompress(bytes.slice(5));
      compression = {
        kind: "nvtzstd",
        wrapper_version: bytes[4]
      };
    }
    return decodePayload(payload, compression);
  }
  async function encodeVrtxFile(doc) {
    const payload = encodePayload(doc);
    try {
      const codec = await loadZstd();
      const compressed = codec.compress(payload, 19);
      const out = new Uint8Array(5 + compressed.length);
      out.set([ 86, 82, 84, 88, 4 ], 0);
      out.set(compressed, 5);
      return {
        bytes: out,
        compressed: true
      };
    } catch (err) {
      return {
        bytes: payload,
        compressed: false
      };
    }
  }
  window.vrtxCodec = {
    decode: decodeVrtxFile,
    encode: encodeVrtxFile,
    clone: cloneDoc,
    normalize: normalizeDoc
  };
})();
