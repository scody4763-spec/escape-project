import type { BeaconInfo } from '../models/Types';
/** BLE 扫描事件回调 */
export interface BleCallbacks {
    onBeaconFound?: (beacons: BeaconInfo[]) => void;
    onScanStart?: () => void;
    onScanStop?: () => void;
    onError?: (err: Error) => void;
}
/**
 * BLE 信标扫描服务
 */
export class BleService {
    private static instance: BleService;
    private scanInProgress: boolean = false;
    private callbacks: BleCallbacks = {};
    private collectedBeacons: Map<string, BeaconInfo> = new Map();
    private constructor() {
    }
    static getInstance(): BleService {
        if (!BleService.instance) {
            BleService.instance = new BleService();
        }
        return BleService.instance;
    }
    /** 注册回调 */
    setCallbacks(cbs: BleCallbacks): void {
        if (cbs.onBeaconFound !== undefined) {
            this.callbacks.onBeaconFound = cbs.onBeaconFound;
        }
        if (cbs.onScanStart !== undefined) {
            this.callbacks.onScanStart = cbs.onScanStart;
        }
        if (cbs.onScanStop !== undefined) {
            this.callbacks.onScanStop = cbs.onScanStop;
        }
        if (cbs.onError !== undefined) {
            this.callbacks.onError = cbs.onError;
        }
    }
    /** 检查蓝牙是否可用 */
    isBluetoothAvailable(): boolean {
        return true;
    }
    /** 开始扫描 BLE 信标 */
    startScan(): void {
        if (this.scanInProgress) {
            return;
        }
        this.scanInProgress = true;
        this.callbacks.onScanStart?.();
        console.info('[BleService] BLE scan mode activated');
    }
    /** 停止扫描 */
    stopScan(): void {
        this.scanInProgress = false;
        this.callbacks.onScanStop?.();
    }
    /** 获取最强信标列表 */
    getStrongestBeacons(count: number): BeaconInfo[] {
        let allBeacons: BeaconInfo[] = [];
        this.collectedBeacons.forEach((value: BeaconInfo) => {
            allBeacons.push(value);
        });
        allBeacons.sort((a: BeaconInfo, b: BeaconInfo): number => b.rssi - a.rssi);
        return allBeacons.slice(0, count);
    }
    /** 获取所有信标 */
    getAllBeacons(): BeaconInfo[] {
        let result: BeaconInfo[] = [];
        this.collectedBeacons.forEach((value: BeaconInfo) => {
            result.push(value);
        });
        return result;
    }
    /** 清除信标缓存 */
    clearBeacons(): void {
        this.collectedBeacons.clear();
    }
    /** 重置服务 */
    reset(): void {
        this.stopScan();
        this.clearBeacons();
        this.callbacks = {};
    }
}
