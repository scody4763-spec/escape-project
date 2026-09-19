"""建筑图数据模型：节点、边、图结构"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class GraphNode(BaseModel):
    """图节点"""
    node_key: str
    name: str
    node_type: str  # room, corridor, exit, stair, elevator
    x: float
    y: float = 0.0
    z: float
    floor_id: int
    is_exit: bool = False
    capacity: Optional[int] = None
    population_density: float = 0.0


class GraphEdge(BaseModel):
    """图边"""
    from_node_key: str
    to_node_key: str
    distance: float
    base_weight: float = 1.0
    width: Optional[float] = None
    bidirectional: bool = True
    safety_coefficient: float = 1.0


class SensorReading(BaseModel):
    """传感器实时读数"""
    mac: str
    node_key: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    aqi: Optional[float] = None
    flame: bool = False
    influence_radius: float = 5.0
