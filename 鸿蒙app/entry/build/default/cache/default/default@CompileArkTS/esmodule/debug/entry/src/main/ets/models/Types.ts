/**
 * 数据模型定义
 */
/** 8方向逃生箭头方向 */
export enum EscapeDirection {
    LEFT = "left",
    RIGHT = "right",
    UP = "up",
    DOWN = "down",
    LEFT_UP = "LUp",
    RIGHT_UP = "RUp",
    LEFT_DOWN = "LDown",
    RIGHT_DOWN = "RDown"
}
/** 定位状态 */
export enum LocateStatus {
    LOCATING = 0,
    LOCATED = 1,
    FAILED = 2
}
/** 火警状态 */
export enum AlarmStatus {
    NORMAL = 0,
    FIRE = 1,
    CLEARED = 2
}
/** 主题模式 */
export enum ThemeMode {
    DAY = "day",
    NIGHT = "night"
}
/** 语言设置 */
export enum LangSetting {
    ZH = "zh",
    EN = "en"
}
/** BLE 信标信息 */
export interface BeaconInfo {
    nodeId: string;
    floor: string;
    rssi: number;
    minor?: number;
}
/** 云端定位响应 */
export interface LocationResponse {
    nodeId: string;
    floor: string;
    direction: EscapeDirection;
    exitName: string;
    distance: number;
    estimatedTime: number;
    level: number;
}
/** 图节点（室内导航拓扑） */
export interface GraphNode {
    id: number;
    floorId: number;
    nodeKey: string;
    name: string;
    nodeType: string;
    x: number;
    y: number;
    z: number;
    isExit: number;
}
/** MQTT 报警消息 */
export interface AlarmMessage {
    type: 'alarm' | 'clear' | 'heartbeat';
    nodeId: string;
    floor: string;
    timestamp: number;
    data?: Record<string, string>;
}
/** MQTT 数据消息 */
export interface DataMessage {
    type: 'sensor' | 'device' | 'system';
    nodeId: string;
    floor: string;
    temperature?: number;
    smoke?: number;
    status?: string;
    timestamp: number;
}
/** 逃生知识文章 */
export interface KnowArticle {
    id: string;
    title: string;
    summary: string;
    content: string;
    image?: string;
}
