import { MMKV } from 'react-native-mmkv';

export class LocalStorage {
  private static mmkv = new MMKV();

  public static getItem(key: string): string | null {
    return this.mmkv.getString(key) || null;
  }

  public static setItem(key: string, value: any): void {
    if (typeof value === 'string') {
      this.mmkv.set(key, value);
    } else {
      this.mmkv.set(key, JSON.stringify(value));
    }
  }

  public static removeItem(key: string): void {
    this.mmkv.delete(key);
  }

  public static clear(): void {
    this.mmkv.clearAll();
  }
}


export default LocalStorage;
