class DLinkedNode<K, V> {
  key: K;
  value: V;
  prev: DLinkedNode<K, V> | null = null;
  next: DLinkedNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private cache: Map<K, DLinkedNode<K, V>> = new Map();
  private head: DLinkedNode<K, V> | null = null;
  private tail: DLinkedNode<K, V> | null = null;
  private size = 0;

  constructor(private capacity: number) {}

  get(key: K): V | null {
    const node = this.cache.get(key);
    if (!node) {
      return null;
    }
    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const node = this.cache.get(key);
    if (node) {
      node.value = value;
      this.moveToHead(node);
    } else {
      const newNode = new DLinkedNode(key, value);
      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.size++;
      if (this.size > this.capacity) {
        const tail = this.popTail();
        if (tail) {
          this.cache.delete(tail.key);
          this.size--;
        }
      }
    }
  }

  private addToHead(node: DLinkedNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: DLinkedNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: DLinkedNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private popTail(): DLinkedNode<K, V> | null {
    const tail = this.tail;
    if (tail) {
      this.removeNode(tail);
    }
    return tail;
  }

  public getCacheSize(): number {
    return this.size;
  }
}
