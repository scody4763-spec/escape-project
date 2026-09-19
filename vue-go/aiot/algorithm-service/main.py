"""逃生路径算法微服务 - FastAPI 入口"""

import faulthandler
import time

# 诊断用：每 30 秒 dump 一次线程堆栈（卡死时定位问题）
faulthandler.enable()
faulthandler.dump_traceback_later(30, repeat=True)

from fastapi import FastAPI, HTTPException

from algorithms.aco import (
    AntColonyOptimizer,
    GreedyPathFinder,
    ImprovedAntColonyOptimizer,
    compute_path_metrics,
)
from models.request import EscapeRequest, EscapeResponse, PathResult

app = FastAPI(
    title="AIoT 逃生路径算法服务",
    description="提供贪心算法、基础蚁群算法、改进蚁群算法的逃生路径计算",
    version="1.0.0",
)


def build_solver(req: EscapeRequest, algorithm: str):
    common = dict(
        nodes=req.nodes,
        edges=req.edges,
        sensor_data=req.sensor_data,
        params=req.params,
        density=req.density,
        safety=req.safety,
        fire_points=req.fire_points,
    )
    if algorithm == "greedy":
        return GreedyPathFinder(**common), None
    if algorithm == "iaco":
        return ImprovedAntColonyOptimizer(**common), None
    return AntColonyOptimizer(**common), None


def run_algorithm(req: EscapeRequest, algorithm: str) -> EscapeResponse:
    start_ms = time.time()

    node_keys = {n.node_key for n in req.nodes}
    if req.start_node not in node_keys:
        raise HTTPException(status_code=400, detail=f"起点 {req.start_node} 不存在于图节点中")

    exits = [n for n in req.nodes if n.is_exit]
    if not exits:
        raise HTTPException(status_code=400, detail="图中没有出口节点")

    solver, _ = build_solver(req, algorithm)
    results = solver.solve(req.start_node)

    paths = []
    for exit_key, (path_nodes, cost) in results.items():
        exit_node = next((n for n in req.nodes if n.node_key == exit_key), None)
        safety_sum, density_sum = compute_path_metrics(solver.solver if algorithm == "greedy" else solver, path_nodes)
        convergence_iteration = getattr(solver, "best_iteration", 1)
        if algorithm == "greedy":
            convergence_iteration = 1
        paths.append(PathResult(
            exit_node=exit_key,
            exit_name=exit_node.name if exit_node else exit_key,
            nodes=path_nodes,
            total_cost=round(cost, 2),
            estimated_time=AntColonyOptimizer.estimate_time(cost),
            safety_sum=safety_sum,
            density_sum=density_sum,
            convergence_iteration=convergence_iteration,
        ))

    if algorithm == "iaco":
        # IACO 的最优路径按平均安全系数从高到低排序，代价作为次优参考
        paths.sort(key=lambda p: (-(p.safety_sum / max(1, len(p.nodes) - 1)), p.total_cost))
    else:
        paths.sort(key=lambda p: p.total_cost)

    elapsed_ms = int((time.time() - start_ms) * 1000)
    convergence = getattr(solver, "convergence_history", [])

    return EscapeResponse(
        algorithm=algorithm,
        paths=paths,
        compute_time_ms=elapsed_ms,
        convergence=convergence,
        convergence_cost=getattr(solver, "convergence_cost", []),
        convergence_safety=getattr(solver, "convergence_safety", []),
        convergence_iteration=getattr(solver, "best_iteration", 1),
        convergence_iteration_cost=getattr(solver, "best_iter_cost", 0),
        convergence_iteration_safety=getattr(solver, "best_iter_safety", 0),
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/escape/aco", response_model=EscapeResponse)
async def escape_aco(req: EscapeRequest):
    """基础蚁群算法计算逃生路径（兼容旧接口）"""
    return run_algorithm(req, "aco")


@app.post("/api/escape/calculate", response_model=EscapeResponse)
async def escape_calculate(req: EscapeRequest):
    """通用逃生路径计算接口，支持 greedy / aco / iaco / compare"""
    if req.compare:
        start_ms = time.time()
        results = [
            run_algorithm(req, "greedy"),
            run_algorithm(req, "aco"),
            run_algorithm(req, "iaco"),
        ]
        elapsed_ms = int((time.time() - start_ms) * 1000)
        return EscapeResponse(
            algorithm="compare",
            paths=[],
            compute_time_ms=elapsed_ms,
            convergence=[],
            results=results,
        )

    if req.algorithm in ("greedy", "aco", "iaco"):
        return run_algorithm(req, req.algorithm)
    raise HTTPException(status_code=400, detail=f"不支持的算法: {req.algorithm}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8090, reload=True)
