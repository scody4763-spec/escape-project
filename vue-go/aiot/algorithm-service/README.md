# 逃生路线算法服务

基于 Python 3.11、FastAPI、Uvicorn 和 NumPy 实现。

已实现：

- `greedy`：贪心路径基线
- `aco`：基础蚁群算法
- `iaco`：改进蚁群算法
- `compare`：同时比较 Greedy、ACO 和 IACO

接口：

```text
GET  /health
POST /api/escape/calculate
POST /api/escape/aco
```

当前生产环境通过 Docker Compose 启动，服务端口为 `8090`：

```bash
cd ../..
docker compose up -d algorithm-service
```
