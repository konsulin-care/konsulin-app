package main

// buildCoOccurrenceMatrix builds a matrix of keyword co-occurrences.
func buildCoOccurrenceMatrix(keywords map[string][]string) map[string]map[string]int {
	matrix := make(map[string]map[string]int)

	for _, words := range keywords {
		for i, w1 := range words {
			if matrix[w1] == nil {
				matrix[w1] = make(map[string]int)
			}
			for j, w2 := range words {
				if i != j {
					matrix[w1][w2]++
				}
			}
		}
	}

	return matrix
}

// unionFind is a disjoint set data structure.
type unionFind struct {
	parent map[string]string
	rank   map[string]int
}

func newUnionFind() *unionFind {
	return &unionFind{
		parent: make(map[string]string),
		rank:   make(map[string]int),
	}
}

func (uf *unionFind) Add(x string) {
	if _, ok := uf.parent[x]; !ok {
		uf.parent[x] = x
		uf.rank[x] = 0
	}
}

func (uf *unionFind) Find(x string) string {
	if uf.parent[x] != x {
		uf.parent[x] = uf.Find(uf.parent[x]) // Path compression
	}
	return uf.parent[x]
}

func (uf *unionFind) Union(x, y string) {
	rx, ry := uf.Find(x), uf.Find(y)
	if rx == ry {
		return
	}
	// Union by rank
	if uf.rank[rx] < uf.rank[ry] {
		uf.parent[rx] = ry
	} else if uf.rank[rx] > uf.rank[ry] {
		uf.parent[ry] = rx
	} else {
		uf.parent[ry] = rx
		uf.rank[rx]++
	}
}

// clusterKeywords groups keywords that co-occur frequently.
func clusterKeywords(matrix map[string]map[string]int) [][]string {
	uf := newUnionFind()

	// Add all keywords
	for word := range matrix {
		uf.Add(word)
	}

	// Union keywords that co-occur
	for w1, connections := range matrix {
		for w2, count := range connections {
			if count > 0 {
				uf.Union(w1, w2)
			}
		}
	}

	// Group by root
	groups := make(map[string][]string)
	for word := range matrix {
		root := uf.Find(word)
		groups[root] = append(groups[root], word)
	}

	// Convert to slice
	var clusters [][]string
	for _, group := range groups {
		clusters = append(clusters, group)
	}

	return clusters
}
