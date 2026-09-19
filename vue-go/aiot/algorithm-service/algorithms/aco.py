"""蚁群算法 (Ant Colony Optimization) 实现逃生路径求解

包含三种方法：
- GreedyPathFinder：贪心算法，作为对比基线
- AntColonyOptimizer：基础蚁群算法
- ImprovedAntColonyOptimizer：改进蚁群算法（自适应挥发、精英更新、信息素上下限、多出口分配）
"""

from __future__ import annotations

import math
import random
from typing import Optional

import numpy as np

from models.graph import GraphEdge, GraphNode, SensorReading


class AntColonyOptimizer:
    """蚁群算法求解器"""

    DEFAULT_PARAMS = {
        "ant_count": 30,
        "alpha": 1.0,
        "beta": 3.0,
        "rho": 0.3,
        "rho_min": 0.1,
        "rho_max": 0.5,
        "rho_decay": 0.05,
        "Q": 100.0,
        "max_iterations": 200,
        "danger_weight": 10.0,
        "density_weight": 0.5,
        "density_max": 4.0,
        "fire_radius": 8.0,
        "tau_min": 0.01,
        "tau_max": 10.0,
        "seed": None,
    }

    def __init__(
        self,
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        sensor_data: Optional[list[SensorReading]] = None,
        params: Optional[dict] = None,
        density: Optional[dict] = None,
        safety: Optional[dict] = None,
        fire_points: Optional[list[str]] = None,
        improved: bool = False,
    ):
        self.params = {**self.DEFAULT_PARAMS, **(params or {})}
        if self.params.get("seed") is not None:
            random.seed(self.params["seed"])
        self.nodes = {n.node_key: n for n in nodes}
        self.edges = edges
        self.sensor_data = sensor_data or []
        self.density = density or {}
        self.safety = safety or {}
        self.fire_points = fire_points or []
        self.improved = improved
        self.current_rho = self.params["rho"]
        self.convergence_history: list[float] = []
        self.convergence_cost: list[float] = []
        self.convergence_safety: list[float] = []
        self.best_iteration = 0
        self.best_iter_cost = 0
        self.best_iter_safety = 0
        self._danger_cache: dict[str, float] = {}
        self.edge_map: dict[str, GraphEdge] = {}
        for edge in self.edges:
            self.edge_map[f"{edge.from_node_key}->{edge.to_node_key}"] = edge
            if edge.bidirectional:
                self.edge_map[f"{edge.to_node_key}->{edge.from_node_key}"] = edge

        # 构建邻接表
        self.adj: dict[str, list[tuple[str, float]]] = {}
        self._build_graph()

        # 信息素矩阵
        self.pheromone: dict[str, float] = {}
        for edge in self.edges:
            key = f"{edge.from_node_key}->{edge.to_node_key}"
            self.pheromone[key] = 1.0
            if edge.bidirectional:
                rev_key = f"{edge.to_node_key}->{edge.from_node_key}"
                self.pheromone[rev_key] = 1.0

        # 出口节点列表
        self.exits = [k for k, n in self.nodes.items() if n.is_exit]

    def _build_graph(self):
        """构建加权邻接表，结合密集度、安全系数和火灾危险场动态调整权值"""
        for edge in self.edges:
            cost = self._edge_cost(edge.from_node_key, edge.to_node_key)
            if edge.from_node_key not in self.adj:
                self.adj[edge.from_node_key] = []
            self.adj[edge.from_node_key].append((edge.to_node_key, cost))

            if edge.bidirectional:
                rev_cost = self._edge_cost(edge.to_node_key, edge.from_node_key)
                if edge.to_node_key not in self.adj:
                    self.adj[edge.to_node_key] = []
                self.adj[edge.to_node_key].append((edge.from_node_key, rev_cost))

    def _node_distance(self, a: str, b: str) -> float:
        na = self.nodes.get(a)
        nb = self.nodes.get(b)
        if not na or not nb:
            return float("inf")
        dx = (na.x or 0) - (nb.x or 0)
        dy = (na.y or 0) - (nb.y or 0)
        dz = (na.z or 0) - (nb.z or 0)
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    def _density(self, node_key: str) -> float:
        if node_key in self.density:
            return float(self.density[node_key])
        node = self.nodes.get(node_key)
        if node is None:
            return 0.0
        return float(getattr(node, "population_density", 0) or 0)

    def _base_safety_for(self, from_key: str, to_key: str) -> float:
        edge = self.edge_map.get(f"{from_key}->{to_key}")
        width = float(edge.width) if edge is not None and edge.width else 3.0
        width_score = max(0.5, min(1.0, width / 4.0))

        from_node = self.nodes.get(from_key)
        to_node = self.nodes.get(to_key)
        type_score = 1.0
        node_types = []
        if from_node is not None:
            node_types.append(from_node.node_type)
        if to_node is not None:
            node_types.append(to_node.node_type)
        if "exit" in node_types:
            type_score = 1.2
        elif "stair" in node_types:
            type_score = 1.1
        elif "elevator" in node_types:
            type_score = 0.5
        elif "room" in node_types:
            type_score = 0.9

        return width_score * type_score

    def _safety_for(self, from_key: str, to_key: str) -> float:
        candidates = [
            f"{from_key}->{to_key}",
            f"{from_key}_{to_key}",
            f"{from_key}-{to_key}",
            f"{to_key}->{from_key}",
            f"{to_key}_{from_key}",
            f"{to_key}-{from_key}",
        ]
        for k in candidates:
            if k in self.safety:
                val = float(self.safety[k])
                return val if val > 0 else 0.05

        base = self._base_safety_for(from_key, to_key)
        danger = (self._danger(from_key) + self._danger(to_key)) / 2.0
        fire_factor = math.exp(-danger / 50.0)
        density = (self._density(from_key) + self._density(to_key)) / 2.0
        density_factor = 1.0 / (1.0 + 0.2 * density)
        return max(0.05, base * fire_factor * density_factor)

    def _danger(self, node_key: str) -> float:
        if node_key in self._danger_cache:
            return self._danger_cache[node_key]

        danger = 0.0
        for fp in self.fire_points:
            if fp not in self.nodes:
                continue
            dist = self._node_distance(node_key, fp)
            if math.isinf(dist):
                continue
            danger = max(danger, 100.0 * math.exp(-dist / self.params["fire_radius"]))

        for sr in self.sensor_data:
            if sr.node_key != node_key:
                continue
            if sr.flame:
                danger = max(danger, 100.0)
            if sr.temperature and sr.temperature > 50:
                danger = max(danger, (sr.temperature - 50) * 2.0)
            if sr.aqi and sr.aqi > 200:
                danger = max(danger, (sr.aqi - 200) * 0.1)

        self._danger_cache[node_key] = danger
        return danger

    def _edge_cost(self, from_key: str, to_key: str) -> float:
        """边代价：距离 * 拥挤惩罚 / 安全系数 + 火灾危险惩罚"""
        edge = self.edge_map.get(f"{from_key}->{to_key}")
        if edge is None:
            return 99999.0

        base = edge.distance * edge.base_weight
        density = (self._density(from_key) + self._density(to_key)) / 2.0
        safety = self._safety_for(from_key, to_key)
        if safety <= 0:
            safety = 0.05
        danger = (self._danger(from_key) + self._danger(to_key)) / 2.0

        cost = (
            base
            * (1.0 + self.params["density_weight"] * density / self.params["density_max"])
            / safety
        )
        cost += danger * self.params["danger_weight"]
        return cost

    def _edge_key(self, from_key: str, to_key: str) -> str:
        return f"{from_key}->{to_key}"

    def _get_weight(self, from_key: str, to_key: str) -> float:
        neighbors = self.adj.get(from_key, [])
        for nk, w in neighbors:
            if nk == to_key:
                return w
        return 99999.0

    def _heuristic(self, from_key: str, to_key: str) -> float:
        w = self._get_weight(from_key, to_key)
        if w <= 0:
            return 1e-10
        return 1.0 / w

    def _select_next(self, current: str, visited: set[str]) -> Optional[str]:
        neighbors = self.adj.get(current, [])
        candidates = [(nk, w) for nk, w in neighbors if nk not in visited]
        if not candidates:
            return None

        alpha = self.params["alpha"]
        beta = self.params["beta"]

        probabilities = []
        for nk, _w in candidates:
            ek = self._edge_key(current, nk)
            tau = self.pheromone.get(ek, 1.0)
            eta = self._heuristic(current, nk)
            probabilities.append((tau ** alpha) * (eta ** beta))

        total = sum(probabilities)
        if total == 0:
            return random.choice(candidates)[0]

        probabilities = [p / total for p in probabilities]
        r = random.random()
        cumsum = 0.0
        for i, (nk, _w) in enumerate(candidates):
            cumsum += probabilities[i]
            if r <= cumsum:
                return nk
        return candidates[-1][0]

    def _run_ant(self, start: str, target_exit: str) -> Optional[tuple[list[str], float]]:
        path = [start]
        visited = {start}
        total_cost = 0.0
        current = start
        max_steps = len(self.nodes) * 2

        for _ in range(max_steps):
            if current == target_exit:
                return path, total_cost
            next_node = self._select_next(current, visited)
            if next_node is None:
                return None
            cost = self._get_weight(current, next_node)
            total_cost += cost
            path.append(next_node)
            visited.add(next_node)
            current = next_node
        return None

    def _update_pheromone(
        self,
        all_paths: list[tuple[list[str], float]],
        elite: bool = False,
    ):
        rho = self.current_rho
        Q = self.params["Q"]

        for key in self.pheromone:
            self.pheromone[key] *= (1 - rho)
            self.pheromone[key] = max(self.pheromone[key], 1e-10)

        paths = all_paths
        if elite:
            best_by_exit: dict[str, tuple[list[str], float]] = {}
            for path, cost in all_paths:
                if not path:
                    continue
                exit_key = path[-1]
                if exit_key not in best_by_exit or cost < best_by_exit[exit_key][1]:
                    best_by_exit[exit_key] = (path, cost)
            paths = list(best_by_exit.values())

        for path, cost in paths:
            if cost <= 0:
                continue
            deposit = Q / cost
            for i in range(len(path) - 1):
                ek = self._edge_key(path[i], path[i + 1])
                self.pheromone[ek] = self.pheromone.get(ek, 1e-10) + deposit

        if self.improved:
            tau_min = self.params["tau_min"]
            tau_max = self.params["tau_max"]
            for key in self.pheromone:
                self.pheromone[key] = min(max(self.pheromone[key], tau_min), tau_max)

    def _path_avg_safety(self, path: list[str]) -> float:
        if len(path) < 2:
            return 0.0
        total = 0.0
        for i in range(len(path) - 1):
            total += self._safety_for(path[i], path[i + 1])
        return total / (len(path) - 1)

    def _should_replace_best(self, prev, result) -> bool:
        if prev is None:
            return True
        if self.improved:
            cur = self._path_avg_safety(result[0])
            old = self._path_avg_safety(prev[0])
            if cur > old:
                return True
            if cur == old and result[1] < prev[1]:
                return True
            return False
        return result[1] < prev[1]

    def solve(self, start_node: str) -> dict[str, tuple[list[str], float]]:
        if start_node not in self.nodes:
            return {}

        ant_count = self.params["ant_count"]
        max_iter = self.params["max_iterations"]
        best: dict[str, tuple[list[str], float]] = {}
        self.convergence_history = []
        self.best_iteration = 0

        for iteration in range(max_iter):
            if self.improved:
                self.current_rho = (
                    self.params["rho_min"]
                    + (self.params["rho_max"] - self.params["rho_min"])
                    * math.exp(-self.params["rho_decay"] * iteration)
                )
            else:
                self.current_rho = self.params["rho"]

            iteration_paths: list[tuple[list[str], float]] = []
            for ant_idx in range(ant_count):
                if self.improved and self.exits:
                    exit_key = self.exits[ant_idx % len(self.exits)]
                    result = self._run_ant(start_node, exit_key)
                    if result is not None:
                        iteration_paths.append(result)
                        if self._should_replace_best(best.get(exit_key), result):
                            best[exit_key] = result
                else:
                    for exit_key in self.exits:
                        result = self._run_ant(start_node, exit_key)
                        if result is not None:
                            iteration_paths.append(result)
                            if self._should_replace_best(best.get(exit_key), result):
                                best[exit_key] = result

            if iteration_paths:
                self._update_pheromone(iteration_paths, elite=self.improved)

            if best:
                # 全局最优路径：基础蚁群按代价、改进蚁群按安全优先（与 _should_replace_best 口径一致）
                if self.improved:
                    opt = max(best.values(), key=lambda x: (self._path_avg_safety(x[0]), -x[1]))
                else:
                    opt = min(best.values(), key=lambda x: x[1])
                best_cost = opt[1]
                best_safety = self._path_avg_safety(opt[0])
                c_rounded = round(best_cost, 2)
                s_rounded = round(best_safety, 4)
                self.convergence_cost.append(c_rounded)
                self.convergence_safety.append(s_rounded)
                if len(self.convergence_cost) == 1 or c_rounded < self.convergence_cost[-2]:
                    self.best_iter_cost = iteration + 1
                if len(self.convergence_safety) == 1 or s_rounded > self.convergence_safety[-2]:
                    self.best_iter_safety = iteration + 1
                # 主准则收敛代数（向后兼容）：基础蚁群按代价、改进蚁群按安全
                if self.improved:
                    self.convergence_history.append(s_rounded)
                    if len(self.convergence_history) == 1 or s_rounded > self.convergence_history[-2]:
                        self.best_iteration = iteration + 1
                else:
                    self.convergence_history.append(c_rounded)
                    if len(self.convergence_history) == 1 or c_rounded < self.convergence_history[-2]:
                        self.best_iteration = iteration + 1
            else:
                self.convergence_cost.append(99999.0)
                self.convergence_safety.append(0.0)
                self.convergence_history.append(0.0 if self.improved else 99999.0)

        return best

    @staticmethod
    def estimate_time(cost: float, speed: float = 1.5) -> str:
        seconds = cost / speed
        if seconds < 60:
            return f"{int(seconds)}s"
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m{secs}s"


class ImprovedAntColonyOptimizer(AntColonyOptimizer):
    """改进蚁群算法：自适应挥发、精英更新、信息素上下限、多出口分配、贪心回溯初始信息素注入"""

    GREEDY_INIT_BOOST = 0.4

    def __init__(self, *args, **kwargs):
        kwargs["improved"] = True
        super().__init__(*args, **kwargs)

    def _inject_greedy_pheromone(self, start_node: str):
        """使用贪心回溯可行路径提升初始信息素，引导蚂蚁沿可行方向搜索。"""
        for key in self.pheromone:
            self.pheromone[key] = 1.0
        if start_node not in self.nodes:
            return
        try:
            greedy = GreedyPathFinder(
                nodes=list(self.nodes.values()),
                edges=self.edges,
                sensor_data=self.sensor_data,
                params=self.params,
                density=self.density,
                safety=self.safety,
                fire_points=self.fire_points,
            )
        except TypeError:
            return
        results = greedy.solve(start_node)
        if not results:
            return
        boost = self.GREEDY_INIT_BOOST * self.params["tau_max"]
        for path, _cost in results.values():
            for i in range(len(path) - 1):
                for key in (
                    f"{path[i]}->{path[i + 1]}",
                    f"{path[i + 1]}->{path[i]}",
                ):
                    if key in self.pheromone:
                        self.pheromone[key] = max(
                            self.pheromone[key],
                            1.0 + boost,
                        )
                        self.pheromone[key] = min(
                            self.params["tau_max"],
                            max(self.params["tau_min"], self.pheromone[key]),
                        )

    def solve(self, start_node: str) -> dict[str, tuple[list[str], float]]:
        self._inject_greedy_pheromone(start_node)
        return super().solve(start_node)


class GreedyPathFinder:
    """贪心算法：每步选择当前代价最小的边，作为对比基线"""

    def __init__(
        self,
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        sensor_data: Optional[list[SensorReading]] = None,
        params: Optional[dict] = None,
        density: Optional[dict] = None,
        safety: Optional[dict] = None,
        fire_points: Optional[list[str]] = None,
    ):
        self.solver = AntColonyOptimizer(
            nodes,
            edges,
            sensor_data,
            params,
            density,
            safety,
            fire_points,
        )

    def _dfs_greedy(self, current: str, target: str, visited: set[str], path: list[str]):
        # 递归调用预算：防止稠密图上 DFS 搜索树指数爆炸（超限快速失败）
        self._greedy_budget -= 1
        if self._greedy_budget <= 0:
            return None
        if current == target:
            return path
        if len(path) > len(self.solver.nodes) * 2:
            return None

        neighbors = [
            (nk, self.solver._edge_cost(current, nk))
            for nk, _w in self.solver.adj.get(current, [])
            if nk not in visited
        ]
        neighbors.sort(key=lambda x: x[1])

        for nk, _cost in neighbors:
            visited.add(nk)
            result = self._dfs_greedy(nk, target, visited, path + [nk])
            if result is not None:
                return result
            visited.remove(nk)
        return None

    def solve(self, start_node: str) -> dict[str, tuple[list[str], float]]:
        solver = self.solver
        if start_node not in solver.nodes:
            return {}

        # 总递归预算（全部出口共享），耗尽即放弃剩余搜索
        self._greedy_budget = 200000

        results = {}
        for exit_key in solver.exits:
            visited = {start_node}
            path = self._dfs_greedy(start_node, exit_key, visited, [start_node])
            if path is not None:
                total_cost = sum(
                    solver._edge_cost(path[i], path[i + 1])
                    for i in range(len(path) - 1)
                )
                results[exit_key] = (path, total_cost)
        return results


def compute_path_metrics(solver: AntColonyOptimizer, path: list[str]) -> tuple[float, float]:
    """计算路径的安全系数总和与人口密集度总和"""
    safety_sum = 0.0
    for i in range(len(path) - 1):
        safety_sum += solver._safety_for(path[i], path[i + 1])
    density_sum = sum(solver._density(k) for k in path)
    return round(safety_sum, 2), round(density_sum, 2)
