// 小規模な JSON ファイルストア。MVP 用途のため全件メモリ保持し、変更時にファイルへ書き出す。
// 本番運用では PostgreSQL などへ置き換える想定（インターフェースはコレクション単位で薄く保っている）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const COLLECTIONS = ['users', 'companies', 'candidates', 'jobs', 'applications', 'likes', 'employees', 'projects', 'interviews', 'marketHistory'];

export class Store {
  constructor(file) {
    this.file = file;
    this.data = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
    if (file && fs.existsSync(file)) {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const c of COLLECTIONS) this.data[c] = loaded[c] || [];
    }
    this.timer = null;
  }

  isEmpty() {
    return this.data.users.length === 0;
  }

  all(col, filter) {
    const list = this.data[col];
    return filter ? list.filter((x) => Object.entries(filter).every(([k, v]) => x[k] === v)) : list;
  }

  get(col, id) {
    return this.data[col].find((x) => x.id === id) || null;
  }

  insert(col, doc) {
    const now = new Date().toISOString();
    const item = { id: doc.id || crypto.randomUUID(), createdAt: now, updatedAt: now, ...doc };
    this.data[col].push(item);
    this.save();
    return item;
  }

  update(col, id, patch) {
    const item = this.get(col, id);
    if (!item) return null;
    Object.assign(item, patch, { id, updatedAt: new Date().toISOString() });
    this.save();
    return item;
  }

  remove(col, id) {
    const i = this.data[col].findIndex((x) => x.id === id);
    if (i < 0) return false;
    this.data[col].splice(i, 1);
    this.save();
    return true;
  }

  reset() {
    for (const c of COLLECTIONS) this.data[c] = [];
    this.save();
  }

  save() {
    if (!this.file) return;
    // 連続書き込みをまとめる
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 50);
  }

  flush() {
    if (!this.file) return;
    clearTimeout(this.timer);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
}
