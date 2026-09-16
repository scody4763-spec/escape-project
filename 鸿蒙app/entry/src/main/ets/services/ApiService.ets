/**
 * HTTP API 服务
 * 用于云端定位计算接口和数据获取
 */
import { http } from '@kit.NetworkKit';
import { API_CONFIG, PREF_KEYS } from '../util/Constants';
import { PreferencesUtil } from '../util/PreferencesUtil';
import type { BeaconInfo, LocationResponse, KnowArticle, GraphNode } from '../models/Types';
import { EscapeDirection } from '../models/Types';

/** 后端统一响应包裹 */
interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T | null;
}

/** 图节点列表响应 */
interface GraphNodesData {
  list: GraphNode[];
}

/** 后端定位响应（snake_case） */
interface LocationRawResponse {
  success: boolean;
  floor: number;
  node_id: string;
  direction: string;
  exit_name: string;
  distance: number;
  estimated_time: number;
}

/**
 * API 服务
 */
export class ApiService {
  private static instance: ApiService;
  private httpClient: http.HttpRequest;

  private constructor() {
    this.httpClient = http.createHttp();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * 上报 BLE 信标并获取逃生定位结果
   * 流程: 取最强信标楼层 → 查图节点 → 信标 minor 映射节点坐标 → 调定位接口
   */
  async reportLocation(beacons: BeaconInfo[]): Promise<LocationResponse | null> {
    try {
      if (beacons.length === 0) {
        return null;
      }
      // 取最强信标（已按 RSSI 排序）
      const beacon: BeaconInfo = beacons[0];
      const floorNum: number = this.parseFloor(beacon.floor);
      if (floorNum <= 0) {
        console.error(`[ApiService] invalid floor: ${beacon.floor}`);
        return null;
      }

      // 1. 获取该楼层图节点
      const nodes: GraphNode[] = await this.getGraphNodes(floorNum);
      if (nodes.length === 0) {
        console.error(`[ApiService] no graph nodes for floor ${floorNum}`);
        return null;
      }

      // 2. 用信标 minor 映射图节点（minor 从 1 开始，对应节点列表索引 minor-1）
      let nodeIndex: number = 0;
      if (beacon.minor !== undefined && beacon.minor >= 1 && beacon.minor <= nodes.length) {
        nodeIndex = beacon.minor - 1;
      }
      const node: GraphNode = nodes[nodeIndex];
      console.info(`[ApiService] mapped beacon minor=${beacon.minor} -> nodeKey=${node.nodeKey} (x=${node.x}, y=${node.y})`);

      // 3. 调用定位接口（线上后端从 query 取参：openid + latitude + longitude）
      const openId: string = await this.getOrCreateOpenId();
      const url: string = `${API_CONFIG.BASE_URL}${API_CONFIG.LOCATION_ENDPOINT}` +
        `?openid=${encodeURIComponent(openId)}&latitude=${node.x}&longitude=${node.y}`;

      const requestOptions: http.HttpRequestOptions = {
        method: http.RequestMethod.POST,
        connectTimeout: API_CONFIG.TIMEOUT,
        readTimeout: API_CONFIG.TIMEOUT
      };

      const resp: http.HttpResponse = await this.httpClient.request(url, requestOptions);
      if (resp.responseCode !== 200 || resp.result === undefined || resp.result === null) {
        console.error(`[ApiService] location HTTP ${resp.responseCode}`);
        return null;
      }

      const resultStr: string = resp.result.toString();
      const envelope: ApiEnvelope<LocationRawResponse> = JSON.parse(resultStr) as ApiEnvelope<LocationRawResponse>;
      if (envelope.code !== 0 || envelope.data === null) {
        console.error(`[ApiService] location API error: ${envelope.message}`);
        return null;
      }

      const raw: LocationRawResponse = envelope.data;
      const location: LocationResponse = {
        nodeId: raw.node_id,
        floor: `${raw.floor}F`,
        direction: this.mapDirection(raw.direction),
        exitName: raw.exit_name,
        distance: Math.round(raw.distance),
        estimatedTime: raw.estimated_time,
        level: raw.floor
      };
      console.info(`[ApiService] location result: node=${location.nodeId}, dir=${location.direction}, exit=${location.exitName}, dist=${location.distance}m, time=${location.estimatedTime}s`);
      return location;
    } catch (err) {
      console.error(`[ApiService] reportLocation error: ${JSON.stringify(err)}`);
      return null;
    }
  }

  /** 获取指定楼层图节点 */
  private async getGraphNodes(floorId: number): Promise<GraphNode[]> {
    try {
      const url: string = `${API_CONFIG.BASE_URL}${API_CONFIG.GRAPH_NODES_ENDPOINT}?floorId=${floorId}`;
      const requestOptions: http.HttpRequestOptions = {
        method: http.RequestMethod.GET,
        connectTimeout: API_CONFIG.TIMEOUT,
        readTimeout: API_CONFIG.TIMEOUT
      };
      const resp: http.HttpResponse = await this.httpClient.request(url, requestOptions);
      if (resp.responseCode !== 200 || resp.result === undefined || resp.result === null) {
        return [];
      }
      const resultStr: string = resp.result.toString();
      const envelope: ApiEnvelope<GraphNodesData> = JSON.parse(resultStr) as ApiEnvelope<GraphNodesData>;
      if (envelope.code !== 0 || envelope.data === null) {
        return [];
      }
      return envelope.data.list;
    } catch (err) {
      console.error(`[ApiService] getGraphNodes error: ${JSON.stringify(err)}`);
      return [];
    }
  }

  /** 获取或创建设备 openid（持久化存储） */
  private async getOrCreateOpenId(): Promise<string> {
    const pref: PreferencesUtil = PreferencesUtil.getInstance();
    let openId: string = await pref.getString(PREF_KEYS.OPEN_ID, '');
    if (openId.length === 0) {
      openId = `device_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      await pref.putString(PREF_KEYS.OPEN_ID, openId);
    }
    return openId;
  }

  /** 解析楼层字符串 "3F" → 3 */
  private parseFloor(floorStr: string): number {
    const match: RegExpMatchArray | null = floorStr.match(/\d+/);
    if (match !== null) {
      return parseInt(match[0], 10);
    }
    return 0;
  }

  /** 后端方向字符串映射到 EscapeDirection 枚举 */
  private mapDirection(dir: string): EscapeDirection {
    switch (dir) {
      case 'Up': return EscapeDirection.UP;
      case 'Down': return EscapeDirection.DOWN;
      case 'Left': return EscapeDirection.LEFT;
      case 'Right': return EscapeDirection.RIGHT;
      case 'LUp': return EscapeDirection.LEFT_UP;
      case 'RUp': return EscapeDirection.RIGHT_UP;
      case 'LDown': return EscapeDirection.LEFT_DOWN;
      case 'RDown': return EscapeDirection.RIGHT_DOWN;
      default: return EscapeDirection.UP;
    }
  }

  /** GET 获取逃生知识文章列表 */
  async getArticles(): Promise<KnowArticle[]> {
    try {
      const url: string = `${API_CONFIG.BASE_URL}${API_CONFIG.ARTICLES_ENDPOINT}`;
      const requestOptions: http.HttpRequestOptions = {
        method: http.RequestMethod.GET,
        connectTimeout: API_CONFIG.TIMEOUT,
        readTimeout: API_CONFIG.TIMEOUT
      };
      const resp: http.HttpResponse = await this.httpClient.request(url, requestOptions);

      if (resp.responseCode === 200 && resp.result !== undefined && resp.result !== null) {
        const resultStr: string = resp.result.toString();
        const data: KnowArticle[] = JSON.parse(resultStr) as KnowArticle[];
        return data;
      }
      return [];
    } catch (err) {
      console.error(`[ApiService] getArticles error: ${JSON.stringify(err)}`);
      return this.getDefaultArticles();
    }
  }

  /** 离线默认逃生知识 */
  private getDefaultArticles(): KnowArticle[] {
    const articles: KnowArticle[] = [
      {
        id: '1',
        title: '火灾逃生实用知识：牢记这些方法，关键时刻能救命',
        summary: '火灾是日常生活中最易发生、危害极大的安全事故…掌握科学的火灾逃生知识，能最大程度降低伤害。',
        content: '# 火灾逃生实用知识：牢记这些方法，关键时刻能救命\n\n火灾是日常生活中最易发生、危害极大的安全事故，浓烟、高温、有毒气体往往会在短时间内造成危险。掌握科学的火灾逃生知识，能最大程度降低伤害，守护自身与他人的生命安全。\n\n**第一时间报警是关键**\n\n遭遇火灾，第一时间报警是关键。发现火情后，立即拨打 119，清晰说出详细地址、起火物质、火势大小和被困人数，不要慌乱遗漏重要信息。如果是初期小火，在确保安全的前提下，可利用身边灭火器、防火毯、清水等简易工具扑救，控制火势蔓延，但切勿盲目冒险。\n\n**三大禁忌**\n\n火灾逃生必须牢记三大禁忌：不贪恋财物、不乘坐电梯、不盲目跳楼。很多人因折返拿取贵重物品错失最佳逃生时机，电梯在火灾中易断电、形成烟囱效应，是致命危险区域，高层住户跳楼更是极端危险行为，绝对不可取。\n\n**正确逃生姿势**\n\n正确的逃生姿势能有效避险。逃生时用湿毛巾、湿衣物折叠 3 至 4 层捂住口鼻，过滤有毒烟雾和粉尘；弯腰低姿贴墙前行，因为浓烟和热气会向上聚集，贴近地面的空气相对清新安全。沿着疏散指示标志快速撤离，不要拥挤推搡，避免发生踩踏事故。\n\n**不同场景逃生方法**\n\n不同场景的逃生方法各有侧重。住宅起火时，先触摸房门判断温度，若门板冰凉，可低姿快速撤离；若门板发烫、门缝冒烟，说明火势已封堵出口，切勿开门。应紧闭房门，用湿毛巾、湿被褥封堵门缝，向门窗泼水降温，到阳台、窗边挥舞鲜艳衣物或用手电筒发出求救信号，等待救援。在商场、酒店等公共场所，要提前留意安全出口和疏散路线，听从工作人员指挥有序撤离。\n\n**身上着火的处理**\n\n如果身上着火，千万不要奔跑，应就地打滚，用厚重衣物覆盖压灭火苗。逃生过程中若被浓烟围困，可暂时退守到卫生间等相对安全的空间，打开水龙头，保持水源湿润，等待救援。\n\n**日常防火准备**\n\n日常做好防火准备，能有效减少火灾风险。居家不私拉乱接电线，不卧床吸烟，定期检查电器线路；熟悉住所、单位的逃生路线，家中配备灭火器、防火毯、应急手电筒等消防器材。\n\n火灾无情，预防为先，逃生有法。牢记火灾逃生知识，时刻保持警惕，才能在危险来临时沉着应对，平安脱险。'
      },
      {
        id: '2',
        title: '如何正确使用灭火器',
        summary: '记住"提、拔、握、压"四字口诀',
        content: '灭火器使用四步法：\n\n提：提起灭火器\n拔：拔掉保险销\n握：握住喷管对准火焰根部\n压：压下压把喷射\n\n注意事项：\n- 站在上风方向\n- 距离火源2-3米\n- 对准火焰根部喷射\n- 电器火灾使用干粉灭火器'
      },
      {
        id: '3',
        title: '高层建筑逃生注意事项',
        summary: '切勿盲目跳楼，利用疏散通道有序撤离',
        content: '高层建筑逃生要点：\n\n1. 熟悉楼层疏散路线图\n2. 通过楼梯逃生，绝不使用电梯\n3. 如楼梯被烟火封锁，退回室内等待救援\n4. 在窗口发出求救信号（挥舞鲜艳衣物）\n5. 用湿布堵住门缝防止烟雾渗入\n6. 切勿盲目跳楼'
      },
      {
        id: '4',
        title: '火灾预防与日常检查',
        summary: '定期检查电气线路，不超负荷用电',
        content: '日常防火措施：\n\n1. 定期检查电气线路和插座\n2. 不超负荷用电\n3. 不在楼道堆放杂物\n4. 确保疏散通道畅通\n5. 熟悉最近的灭火器和消防栓位置\n6. 家中安装烟雾报警器\n7. 制定家庭逃生计划并演练'
      }
    ];
    return articles;
  }

  /** 释放资源 */
  destroy(): void {
    this.httpClient.destroy();
  }
}
