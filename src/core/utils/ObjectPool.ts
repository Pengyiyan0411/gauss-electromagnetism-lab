// 这是一个通用的内存池，用于复用被频繁创建的对象（比如电场线、箭头）
export class ObjectPool<T> {
  private pool: T[] = [];

  constructor(
    private factory: () => T,       // 怎么造一个新对象
    private reset: (obj: T) => void // 怎么把用过的对象洗干净
  ) {}

  // 获取对象：如果池子里有就拿现成的，没有才造新的
  acquire(): T {
    return this.pool.length > 0 ? this.pool.pop()! : this.factory();
  }

  // 回收对象：用完了还给池子，坚决不要让浏览器回收它
  release(obj: T) {
    this.reset(obj);
    this.pool.push(obj);
  }
}