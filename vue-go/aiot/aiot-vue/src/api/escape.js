import request from './request'
export const calculateEscape = (data) => request.post('/escape/calculate', data)
export const getGraphNodes   = (params) => request.get('/graph/nodes', { params })
export const getGraphEdges   = ()       => request.get('/graph/edges')
