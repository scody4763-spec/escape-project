import ble from "@ohos:bluetooth.ble";
import type { BusinessError } from "@ohos:base";
import type { BeaconInfo } from '../models/Types';
/** Apple iBeacon 厂商 ID */
const APPLE_COMPANY_ID: number = 0x004C;
/** iBeacon 类型标识 */
const IBEACON_TYPE: number = 0x02;
/** iBeacon 数据长度（21 字节） */
const IBEACON_LENGTH: number = 0x15;
/** iBeacon 厂商数据总长：type(1) + len(1) + uuid(16) + major(2) + minor(2) + txPower(1) = 23 */
const IBEACON_DATA_MIN_LEN: number = 23;
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
    /** 保存 BLEDeviceFind 回调引用，用于 off 取消注册 */
    private deviceFindCallback: ((results: Array<ble.ScanResult>) => void) | null = null;
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
    /** 检查蓝牙是否可用（直接尝试扫描，由 startBLEScan 抛错时处理） */
    isBluetoothAvailable(): boolean {
        return true;
    }
    /** 开始扫描 BLE 信标（持续扫描，直到 stopScan） */
    startScan(): void {
        if (this.scanInProgress) {
            return;
        }
        this.deviceFindCallback = (results: Array<ble.ScanResult>) => {
            this.handleScanResults(results);
        };
        try {
            ble.on('BLEDeviceFind', this.deviceFindCallback);
            // 仅扫描 Apple iBeacon（manufactureId = 0x004C）
            const filters: Array<ble.ScanFilter> = [{ manufactureId: APPLE_COMPANY_ID }];
            ble.startBLEScan(filters);
            this.scanInProgress = true;
            this.callbacks.onScanStart?.();
            console.info('[BleService] BLE scan started (iBeacon only)');
        }
        catch (err) {
            console.error(`[BleService] startBLEScan failed: ${JSON.stringify(err)}`);
            this.scanInProgress = false;
            this.callbacks.onError?.(err as Error);
        }
    }
    /** 停止扫描 */
    stopScan(): void {
        if (!this.scanInProgress) {
            return;
        }
        try {
            if (this.deviceFindCallback !== null) {
                ble.off('BLEDeviceFind', this.deviceFindCallback);
                this.deviceFindCallback = null;
            }
            ble.stopBLEScan();
            console.info('[BleService] BLE scan stopped');
        }
        catch (err) {
            console.error(`[BleService] stopBLEScan failed: ${JSON.stringify(err)}`);
        }
        this.scanInProgress = false;
        this.callbacks.onScanStop?.();
    }
    /** 处理扫描结果，解析 iBeacon */
    private handleScanResults(results: Array<ble.ScanResult>): void {
        let foundNew: boolean = false;
        for (const result of results) {
            const beacon: BeaconInfo | null = this.parseIBeacon(result);
            if (beacon !== null) {
                const key: string = beacon.nodeId;
                const existing: BeaconInfo | undefined = this.collectedBeacons.get(key);
                if (existing === undefined || beacon.rssi > existing.rssi) {
                    this.collectedBeacons.set(key, beacon);
                    foundNew = true;
                }
            }
        }
        if (foundNew) {
            this.callbacks.onBeaconFound?.(this.getAllBeacons());
        }
    }
    /**
     * 解析 iBeacon 厂商数据
     * manufacturerDataMap[0x004C] 格式:
     *   [0]: type = 0x02
     *   [1]: length = 0x15 (21)
     *   [2..17]: UUID (16 bytes) = ESP32 MAC 地址（取后 6 字节）
     *   [18..19]: major (大端) = 楼层
     *   [20..21]: minor (大端) = 楼层内编号
     *   [22]: tx power
     */
    private parseIBeacon(result: ble.ScanResult): BeaconInfo | null {
        const mfgMap: Map<number, Uint8Array> | undefined = result.manufacturerDataMap;
        if (mfgMap === undefined) {
            return null;
        }
        const data: Uint8Array | undefined = mfgMap.get(APPLE_COMPANY_ID);
        if (data === undefined || data.length < IBEACON_DATA_MIN_LEN) {
            // 调试: 打印所有非 Apple iBeacon 的设备及其厂商数据
            const keys: number[] = Array.from(mfgMap.keys());
            const name: string = result.deviceName ? result.deviceName : '(no-name)';
            console.info(`[BleService] non-iBeacon device: id=${result.deviceId}, name=${name}, mfgIds=[${keys.join(',')}], rssi=${result.rssi}`);
            return null;
        }
        if (data[0] !== IBEACON_TYPE || data[1] !== IBEACON_LENGTH) {
            // 调试: 有 Apple 厂商数据但不是 iBeacon 格式（可能是 Continuity 协议或其他 ESP32）
            const hex: string = Array.from(data).map((b: number) => b.toString(16).padStart(2, '0')).join('');
            console.info(`[BleService] Apple non-iBeacon: id=${result.deviceId}, type=0x${data[0].toString(16)}, len=${data[1]}, data=${hex}, rssi=${result.rssi}`);
            return null;
        }
        // UUID 中字节 4-9 为 ESP32 MAC 地址（6 字节）
        const uuidBytes: Uint8Array = data.slice(2, 18);
        const uuidHex: string = Array.from(uuidBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
        const macBytes: Uint8Array = uuidBytes.slice(4, 10);
        const mac: string = this.bytesToMac(macBytes);
        // major = 楼层，minor = 楼层内编号（大端序）
        const major: number = (data[18] << 8) | data[19];
        const minor: number = (data[20] << 8) | data[21];
        const beacon: BeaconInfo = {
            nodeId: mac,
            floor: `${major}F`,
            rssi: result.rssi,
            minor: minor
        };
        console.info(`[BleService] iBeacon parsed: uuid=${uuidHex}, nodeId=${mac}, floor=${major}F, minor=${minor}, rssi=${result.rssi}`);
        return beacon;
    }
    /** 字节数组转 MAC 地址字符串 */
    private bytesToMac(bytes: Uint8Array): string {
        const parts: string[] = [];
        for (let i: number = 0; i < bytes.length; i++) {
            parts.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
        }
        return parts.join(':');
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
