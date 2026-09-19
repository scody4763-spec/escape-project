package entity

type GraphEdge struct {
	Id            int     `json:"id"            orm:"id"`
	FromNodeKey   string  `json:"fromNodeKey"   orm:"from_node_key"`
	ToNodeKey     string  `json:"toNodeKey"     orm:"to_node_key"`
	Distance      float64 `json:"distance"      orm:"distance"`
	BaseWeight    float64 `json:"baseWeight"    orm:"base_weight"`
	Width         float64 `json:"width"         orm:"width"`
	Bidirectional int     `json:"bidirectional" orm:"bidirectional"`
	Status        int     `json:"status"        orm:"status"`
}
