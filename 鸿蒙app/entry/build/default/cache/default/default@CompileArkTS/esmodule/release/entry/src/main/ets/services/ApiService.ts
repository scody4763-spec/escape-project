import http from "@ohos:net.http";
import { API_CONFIG } from "@normalized:N&&&entry/src/main/ets/util/Constants&";
import type { BeaconInfo, LocationResponse, KnowArticle } from '../models/Types';
/** 定位请求体中的信标数据结构 */
interface BeaconRequestBody {
    node_id: string;
    floor: string;
    rssi: number;
}
/** 定位请求体 */
interface LocationRequestBody {
    beacons: BeaconRequestBody[];
    timestamp: number;
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
    /** POST 上报信标数据并获取定位结果 */
    async reportLocation(beacons: BeaconInfo[]): Promise<LocationResponse | null> {
        try {
            const url: string = `${API_CONFIG.BASE_URL}${API_CONFIG.LOCATION_ENDPOINT}`;
            const beaconReqList: BeaconRequestBody[] = beacons.map((b: BeaconInfo) => {
                const item: BeaconRequestBody = {
                    node_id: b.nodeId,
                    floor: b.floor,
                    rssi: b.rssi
                };
                return item;
            });
            const requestBody: LocationRequestBody = {
                beacons: beaconReqList,
                timestamp: Date.now()
            };
            const body: string = JSON.stringify(requestBody);
            const requestOptions: http.HttpRequestOptions = {
                method: http.RequestMethod.POST,
                header: { 'Content-Type': 'application/json' },
                extraData: body,
                connectTimeout: API_CONFIG.TIMEOUT,
                readTimeout: API_CONFIG.TIMEOUT
            };
            const resp: http.HttpResponse = await this.httpClient.request(url, requestOptions);
            if (resp.responseCode === 200 && resp.result !== undefined && resp.result !== null) {
                const resultStr: string = resp.result.toString();
                const data: LocationResponse = JSON.parse(resultStr) as LocationResponse;
                return data;
            }
            return null;
        }
        catch (err) {
            console.error(`[ApiService] reportLocation error: ${JSON.stringify(err)}`);
            return null;
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
        }
        catch (err) {
            console.error(`[ApiService] getArticles error: ${JSON.stringify(err)}`);
            return this.getDefaultArticles();
        }
    }
    /** 离线默认逃生知识 */
    private getDefaultArticles(): KnowArticle[] {
        const articles: KnowArticle[] = [
            {
                id: '1',
                title: '火灾逃生基本要领',
                summary: '保持冷静，低姿匍匐，用湿毛巾捂住口鼻',
                content: '火灾发生时，保持冷静是最重要的。\n\n1. 立即判断火源位置和逃生方向\n2. 用湿毛巾或衣物捂住口鼻，防止吸入有毒烟雾\n3. 压低身体，匍匐前进（烟雾向上聚集）\n4. 沿着疏散指示标志逃生\n5. 不要乘坐电梯，使用楼梯逃生\n6. 到达安全区域后立即报警'
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
