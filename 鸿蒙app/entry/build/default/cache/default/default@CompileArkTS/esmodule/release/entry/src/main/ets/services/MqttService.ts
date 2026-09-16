import webSocket from "@ohos:net.webSocket";
import { MQTT_CONFIG } from "@normalized:N&&&entry/src/main/ets/util/Constants&";
import type { AlarmMessage, DataMessage } from '../models/Types';
/** MQTT 事件回调 */
export interface MqttCallbacks {
    onAlarm?: (msg: AlarmMessage) => void;
    onClear?: (msg: AlarmMessage) => void;
    onData?: (msg: DataMessage) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (err: Error) => void;
}
/** MQTT 连接状态 */
enum ConnState {
    DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2
}
/**
 * MQTT 服务（WebSocket 实现）
 */
export class MqttService {
    private static instance: MqttService;
    private ws: webSocket.WebSocket | null = null;
    private connState: ConnState = ConnState.DISCONNECTED;
    private callbacks: MqttCallbacks = {};
    private reconnectTimerId: number = -1;
    private constructor() {
    }
    static getInstance(): MqttService {
        if (!MqttService.instance) {
            MqttService.instance = new MqttService();
        }
        return MqttService.instance;
    }
    /** 是否已连接 */
    isConnected(): boolean {
        return this.connState === ConnState.CONNECTED;
    }
    /** 注册回调 */
    setCallbacks(cbs: MqttCallbacks): void {
        if (cbs.onAlarm !== undefined) {
            this.callbacks.onAlarm = cbs.onAlarm;
        }
        if (cbs.onClear !== undefined) {
            this.callbacks.onClear = cbs.onClear;
        }
        if (cbs.onData !== undefined) {
            this.callbacks.onData = cbs.onData;
        }
        if (cbs.onConnected !== undefined) {
            this.callbacks.onConnected = cbs.onConnected;
        }
        if (cbs.onDisconnected !== undefined) {
            this.callbacks.onDisconnected = cbs.onDisconnected;
        }
        if (cbs.onError !== undefined) {
            this.callbacks.onError = cbs.onError;
        }
    }
    /** 连接 MQTT Broker */
    connect(): void {
        if (this.connState === ConnState.CONNECTING || this.connState === ConnState.CONNECTED) {
            return;
        }
        this.connState = ConnState.CONNECTING;
        try {
            this.ws = webSocket.createWebSocket();
            const url: string = `${MQTT_CONFIG.PROTOCOL}://${MQTT_CONFIG.HOST}:${MQTT_CONFIG.PORT}${MQTT_CONFIG.PATH}`;
            this.ws.on('open', () => {
                this.onWSOpen();
            });
            // WebSocket message 回调签名: (err: Error | undefined, data: string | ArrayBuffer)
            this.ws.on('message', (err: Error | undefined, data: string | ArrayBuffer) => {
                if (err !== undefined && err !== null) {
                    console.error(`[MqttService] message error: ${JSON.stringify(err)}`);
                    return;
                }
                const textData: string = data as string;
                this.onWSMessage(textData);
            });
            this.ws.on('close', () => {
                this.onWSClose();
            });
            this.ws.on('error', (err: Error) => {
                this.onWSError(err);
            });
            // connect 回调签名: (err: Error | undefined, value?: boolean)
            this.ws.connect(url, (err: Error | undefined) => {
                if (err !== undefined && err !== null) {
                    console.error(`[MqttService] connect error: ${JSON.stringify(err)}`);
                    this.connState = ConnState.DISCONNECTED;
                    this.callbacks.onError?.(err as Error);
                }
            });
        }
        catch (err) {
            console.error(`[MqttService] connect error: ${JSON.stringify(err)}`);
            this.connState = ConnState.DISCONNECTED;
            this.callbacks.onError?.(err as Error);
        }
    }
    /** 连接成功回调 */
    private onWSOpen(): void {
        console.info('[MqttService] WebSocket connected');
        this.connState = ConnState.CONNECTED;
        this.callbacks.onConnected?.();
        // 发送 MQTT CONNECT 报文
        const clientId: string = `${MQTT_CONFIG.CLIENT_ID_PREFIX}${Date.now()}`;
        const connPacket: ArrayBuffer = this.buildConnectPacket(clientId);
        this.ws?.send(connPacket);
    }
    /** 构建 MQTT CONNECT 报文 */
    private buildConnectPacket(clientId: string): ArrayBuffer {
        const protocolName: number[] = [0x00, 0x04, 0x4D, 0x51, 0x54, 0x54];
        const protocolLevel: number = 0x04;
        const connectFlags: number = 0x02;
        const keepAlive: number = 60;
        const idBytes: Uint8Array = this.stringToUtf8Bytes(clientId);
        const remainingLen: number = 2 + 4 + 1 + 1 + 2 + 2 + idBytes.length;
        const buffer: ArrayBuffer = new ArrayBuffer(2 + remainingLen);
        const view: DataView = new DataView(buffer);
        let offset: number = 0;
        view.setUint8(offset++, 0x10);
        this.encodeRemainingLength(view, offset, remainingLen);
        offset += this.getEncodedLength(remainingLen);
        for (const byte of protocolName) {
            view.setUint8(offset++, byte);
        }
        view.setUint8(offset++, protocolLevel);
        view.setUint8(offset++, connectFlags);
        view.setUint16(offset, keepAlive);
        offset += 2;
        view.setUint16(offset, idBytes.length);
        offset += 2;
        for (let i: number = 0; i < idBytes.length; i++) {
            view.setUint8(offset++, idBytes[i]);
        }
        return buffer;
    }
    /** 手动 UTF-8 编码 */
    private stringToUtf8Bytes(str: string): Uint8Array {
        const bytes: number[] = [];
        for (let i: number = 0; i < str.length; i++) {
            let code: number = str.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            }
            else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6));
                bytes.push(0x80 | (code & 0x3F));
            }
            else {
                bytes.push(0xE0 | (code >> 12));
                bytes.push(0x80 | ((code >> 6) & 0x3F));
                bytes.push(0x80 | (code & 0x3F));
            }
        }
        return new Uint8Array(bytes);
    }
    private encodeRemainingLength(view: DataView, offset: number, length: number): void {
        let len: number = length;
        do {
            let byte: number = len % 128;
            len = Math.floor(len / 128);
            if (len > 0) {
                byte |= 0x80;
            }
            view.setUint8(offset++, byte);
        } while (len > 0);
    }
    private getEncodedLength(length: number): number {
        let len: number = length;
        let count: number = 0;
        do {
            len = Math.floor(len / 128);
            count++;
        } while (len > 0);
        return count;
    }
    /** 处理收到的消息 */
    private onWSMessage(data: string): void {
        if (data.length === 0) {
            return;
        }
        try {
            const msgObj: Record<string, Object> = JSON.parse(data) as Record<string, Object>;
            const msgType: string = msgObj['type'] as string;
            if (msgType === 'alarm' || msgType === 'clear' || msgType === 'heartbeat') {
                const alarmMsg: AlarmMessage = {
                    type: msgType as 'alarm' | 'clear' | 'heartbeat',
                    nodeId: msgObj['nodeId'] as string,
                    floor: msgObj['floor'] as string,
                    timestamp: msgObj['timestamp'] as number
                };
                if (msgType === 'alarm') {
                    this.callbacks.onAlarm?.(alarmMsg);
                }
                else if (msgType === 'clear') {
                    this.callbacks.onClear?.(alarmMsg);
                }
            }
            else if (msgType === 'sensor' || msgType === 'device' || msgType === 'system') {
                const dataMsg: DataMessage = {
                    type: msgType as 'sensor' | 'device' | 'system',
                    nodeId: msgObj['nodeId'] as string,
                    floor: msgObj['floor'] as string,
                    timestamp: msgObj['timestamp'] as number,
                    temperature: msgObj['temperature'] as number,
                    smoke: msgObj['smoke'] as number,
                    status: msgObj['status'] as string
                };
                this.callbacks.onData?.(dataMsg);
            }
        }
        catch (_e) {
            // 非 JSON 消息，忽略
        }
    }
    private onWSClose(): void {
        this.connState = ConnState.DISCONNECTED;
        this.callbacks.onDisconnected?.();
        this.scheduleReconnect();
    }
    private onWSError(err: Error): void {
        console.error(`[MqttService] error: ${JSON.stringify(err)}`);
        this.connState = ConnState.DISCONNECTED;
        this.callbacks.onError?.(err);
        this.scheduleReconnect();
    }
    private scheduleReconnect(): void {
        if (this.reconnectTimerId !== -1) {
            return;
        }
        this.reconnectTimerId = setTimeout(() => {
            this.reconnectTimerId = -1;
            this.connect();
        }, 5000);
    }
    /** 断开连接 */
    disconnect(): void {
        if (this.reconnectTimerId !== -1) {
            clearTimeout(this.reconnectTimerId);
            this.reconnectTimerId = -1;
        }
        if (this.ws) {
            try {
                this.ws.close();
            }
            catch (_e) {
                // ignore
            }
            this.ws = null;
        }
        this.connState = ConnState.DISCONNECTED;
    }
}
