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
/** MQTT 可变剩余长度解码结果 */
interface DecodedLen {
    value: number;
    offset: number;
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
    private pingTimerId: number = -1;
    private packetIdCounter: number = 0;
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
            // MQTT 报文为二进制帧（CONNACK/PUBLISH 等），JSON 文本帧仅为兼容旧通道
            this.ws.on('message', (err: Error | undefined, data: string | ArrayBuffer) => {
                if (err !== undefined && err !== null) {
                    console.error(`[MqttService] message error: ${JSON.stringify(err)}`);
                    return;
                }
                if (data instanceof ArrayBuffer) {
                    this.onMQTTPacket(new Uint8Array(data));
                }
                else {
                    this.onWSMessage(data);
                }
            });
            this.ws.on('close', (err: Error | undefined, closeResult: webSocket.CloseResult) => {
                console.warn(`[MqttService] WebSocket closed: code=${closeResult?.code}, reason=${closeResult?.reason}`);
                this.onWSClose();
            });
            this.ws.on('error', (err: Error) => {
                this.onWSError(err);
            });
            // connect 回调签名: (err: Error | undefined, value?: boolean)
            // EMQX 要求握手携带 mqtt 子协议（原生 protocol 字段，服务端会回显并完成校验）
            const reqOptions: webSocket.WebSocketRequestOptions = {
                protocol: 'mqtt'
            };
            this.ws.connect(url, reqOptions, (err: Error | undefined) => {
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
        this.startPingTimer();
    }
    /** 构建 MQTT CONNECT 报文 */
    private buildConnectPacket(clientId: string): ArrayBuffer {
        const protocolName: number[] = [0x00, 0x04, 0x4D, 0x51, 0x54, 0x54];
        const protocolLevel: number = 0x04;
        const keepAlive: number = 60;
        const idBytes: Uint8Array = this.stringToUtf8Bytes(clientId);
        const userBytes: Uint8Array = this.stringToUtf8Bytes(MQTT_CONFIG.USERNAME);
        const passBytes: Uint8Array = this.stringToUtf8Bytes(MQTT_CONFIG.PASSWORD);
        const hasUser: boolean = userBytes.length > 0;
        const hasPass: boolean = passBytes.length > 0;
        // clean session(0x02) + username(0x80) + password(0x40)
        let connectFlags: number = 0x02;
        if (hasUser) {
            connectFlags |= 0x80;
        }
        if (hasPass) {
            connectFlags |= 0x40;
        }
        let remainingLen: number = 2 + 4 + 1 + 1 + 2 + 2 + idBytes.length;
        if (hasUser) {
            remainingLen += 2 + userBytes.length;
        }
        if (hasPass) {
            remainingLen += 2 + passBytes.length;
        }
        const buffer: ArrayBuffer = new ArrayBuffer(1 + this.getEncodedLength(remainingLen) + remainingLen);
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
        if (hasUser) {
            view.setUint16(offset, userBytes.length);
            offset += 2;
            for (let i: number = 0; i < userBytes.length; i++) {
                view.setUint8(offset++, userBytes[i]);
            }
        }
        if (hasPass) {
            view.setUint16(offset, passBytes.length);
            offset += 2;
            for (let i: number = 0; i < passBytes.length; i++) {
                view.setUint8(offset++, passBytes[i]);
            }
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
    /** 解码 MQTT 可变剩余长度 */
    private decodeRemainingLength(bytes: Uint8Array, start: number): DecodedLen {
        let value: number = 0;
        let multiplier: number = 1;
        let offset: number = start;
        do {
            value += (bytes[offset] & 0x7F) * multiplier;
            multiplier *= 128;
            offset += 1;
        } while ((bytes[offset - 1] & 0x80) !== 0 && offset < bytes.length);
        const result: DecodedLen = { value: value, offset: offset };
        return result;
    }
    /** 手动 UTF-8 解码 */
    private bytesToUtf8String(bytes: Uint8Array): string {
        let result: string = '';
        let i: number = 0;
        while (i < bytes.length) {
            const byte: number = bytes[i];
            if (byte < 0x80) {
                result += String.fromCharCode(byte);
                i += 1;
            }
            else if (byte < 0xE0) {
                result += String.fromCharCode(((byte & 0x1F) << 6) | (bytes[i + 1] & 0x3F));
                i += 2;
            }
            else if (byte < 0xF0) {
                result += String.fromCharCode(((byte & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F));
                i += 3;
            }
            else {
                const cp: number = ((byte & 0x07) << 18) | ((bytes[i + 1] & 0x3F) << 12) | ((bytes[i + 2] & 0x3F) << 6) | (bytes[i + 3] & 0x3F);
                result += String.fromCharCode(cp);
                i += 4;
            }
        }
        return result;
    }
    /** 处理 MQTT 二进制报文 */
    private onMQTTPacket(bytes: Uint8Array): void {
        if (bytes.length < 2) {
            return;
        }
        const pktType: number = bytes[0] & 0xF0;
        const decoded: DecodedLen = this.decodeRemainingLength(bytes, 1);
        const bodyStart: number = decoded.offset;
        if (pktType === 0x20) { // CONNACK
            if (bytes.length > bodyStart + 1) {
                const returnCode: number = bytes[bodyStart + 1];
                if (returnCode === 0) {
                    console.info('[MqttService] MQTT CONNACK accepted, subscribing topics');
                    this.subscribeAll();
                }
                else {
                    console.error(`[MqttService] MQTT CONNACK rejected, code=${returnCode}`);
                }
            }
        }
        else if (pktType === 0x90) { // SUBACK
            console.info('[MqttService] MQTT SUBACK received');
        }
        else if (pktType === 0xD0) { // PINGRESP
            // 保活响应，忽略
        }
        else if (pktType === 0x30) { // PUBLISH
            const qos: number = (bytes[0] >> 1) & 0x03;
            let pos: number = bodyStart;
            if (pos + 2 > bytes.length) {
                return;
            }
            const topicLen: number = (bytes[pos] << 8) | bytes[pos + 1];
            pos += 2;
            if (pos + topicLen > bytes.length) {
                return;
            }
            const topic: string = this.bytesToUtf8String(bytes.slice(pos, pos + topicLen));
            pos += topicLen;
            if (qos > 0) {
                pos += 2; // 跳过 packet id
            }
            const payload: string = this.bytesToUtf8String(bytes.slice(pos, bytes.length));
            console.info(`[MqttService] PUBLISH topic=${topic} payload=${payload}`);
            this.onWSMessage(payload);
        }
    }
    /** 订阅报警/数据/指令主题 */
    private subscribeAll(): void {
        const topics: string[] = [MQTT_CONFIG.TOPIC_ALARM, MQTT_CONFIG.TOPIC_DATA, MQTT_CONFIG.TOPIC_COMMAND];
        for (const topic of topics) {
            this.packetIdCounter = (this.packetIdCounter + 1) % 0xFFFF;
            const packet: ArrayBuffer = this.buildSubscribePacket(topic, this.packetIdCounter);
            this.ws?.send(packet);
        }
    }
    /** 构建 MQTT SUBSCRIBE 报文（QoS 0） */
    private buildSubscribePacket(topic: string, packetId: number): ArrayBuffer {
        const topicBytes: Uint8Array = this.stringToUtf8Bytes(topic);
        const remainingLen: number = 2 + 2 + topicBytes.length + 1;
        const buffer: ArrayBuffer = new ArrayBuffer(1 + 1 + remainingLen);
        const view: DataView = new DataView(buffer);
        let offset: number = 0;
        view.setUint8(offset++, 0x82);
        view.setUint8(offset++, remainingLen);
        view.setUint16(offset, packetId);
        offset += 2;
        view.setUint16(offset, topicBytes.length);
        offset += 2;
        for (let i: number = 0; i < topicBytes.length; i++) {
            view.setUint8(offset++, topicBytes[i]);
        }
        view.setUint8(offset++, 0x00);
        return buffer;
    }
    /** 构建 MQTT PINGREQ 报文 */
    private buildPingPacket(): ArrayBuffer {
        const buffer: ArrayBuffer = new ArrayBuffer(2);
        const view: DataView = new DataView(buffer);
        view.setUint8(0, 0xC0);
        view.setUint8(1, 0x00);
        return buffer;
    }
    /** MQTT 层保活（keepalive 60s，30s 发一次 PINGREQ） */
    private startPingTimer(): void {
        this.stopPingTimer();
        this.pingTimerId = setInterval(() => {
            if (this.connState === ConnState.CONNECTED) {
                this.ws?.send(this.buildPingPacket());
            }
        }, 30000);
    }
    private stopPingTimer(): void {
        if (this.pingTimerId !== -1) {
            clearInterval(this.pingTimerId);
            this.pingTimerId = -1;
        }
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
        this.stopPingTimer();
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
        this.stopPingTimer();
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
