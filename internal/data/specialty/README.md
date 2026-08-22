# Specialty Ontology System

This package implements an ontology-based specialty system using ISCO-08 (core) and NUCC (extension) taxonomies.

## Overview

The system replaces hardcoded specialty codes with a layered ontology:

1. **ISCO-08 Core Ontology** - International Classification of Occupations (structural hierarchy)
2. **NUCC Terminology Extension** - Healthcare-specific specializations
3. **Proximity Calculation** - Pre-computed distances between specialties

## Architecture

```
internal/data/specialty/
├── config/                    # Configuration files
│   ├── domains.json          # Domain hierarchy
│   ├── stop-words.json       # Stop words for tokenization
│   └── keyword-map.json      # Keyword → domain mapping
├── cmd/generate/             # Generator tool
│   ├── main.go              # Entry point
│   ├── download.go          # Source file download
│   ├── isco.go              # ISCO-08 parser
│   ├── nucc.go              # NUCC parser
│   ├── keywords.go          # Keyword extraction
│   ├── domains.go           # Domain generation
│   ├── signatures.go        # Domain signature computation
│   ├── proximity.go         # Proximity calculation
│   └── output.go            # Output generation (sharded)
├── proximity/                # Generated proximity data (DO NOT EDIT)
│   ├── types.go             # Table type definition
│   └── shard_00..49.go      # Proximity data shards
├── types.go                  # Ontology types
├── index.go                  # Runtime lookup struct
├── match.go                  # Runtime matching function
└── generate.go               # go:generate directive
```

## Usage

### Generate Data

```bash
make data-specialty
```

This will:

1. Download ISCO-08 and NUCC taxonomy files (cached for 24 hours)
2. Parse the source files
3. Extract keywords and compute domain signatures
4. Compute proximity table
5. Generate 50 shard files in `proximity/` subdirectory
6. Generate TypeScript type definitions

**Note:** The `proximity/` directory is auto-generated. Regenerate when:

- ISCO-08 taxonomy updates
- NUCC taxonomy updates
- Domain signature logic changes

### Runtime Matching

```go
import "github.com/konsulin-care/konsulin-app/internal/data/specialty"

// Load the generated index
idx := specialty.LoadIndex()

// Match user input
matches := specialty.MatchSpecialty("family medicine", idx)

// Get proximity between specialties
score := idx.GetProximity("207Q00000X", "2084P0800X")
```

## Configuration

### domains.json

Defines the hierarchical domain structure:

```json
{
  "healthcare": {
    "physical-health": {
      "musculoskeletal": {},
      "cardiovascular": {}
    },
    "mental-health": {
      "mood-disorders": {},
      "behavioral-health": {}
    }
  }
}
```

### stop-words.json

Standard English stop words removed during tokenization.

### keyword-map.json

Maps keywords to domain paths (overrides auto-derived mappings):

```json
{
  "mental": "mental-health",
  "behavioral": "behavioral-health",
  "joint": "musculoskeletal"
}
```

## Proximity Calculation

The proximity between two specialties is calculated as:

```
distance = 0.6 * clinical + 0.3 * domain + 0.1 * structural
```

Where:

- **clinical**: NUCC grouping/classification similarity
- **domain**: Jaccard similarity of ICF domain signatures
- **structural**: ISCO-08 hierarchical distance (inverse depth of LCA)

## Data Sharding

Proximity data is split into 50 shard files (`shard_00.go` through `shard_49.go`) for:

- Faster code generation (buffered writes vs. string concatenation)
- Manageable file sizes (~10K lines each)
- Granular git diffs

Each shard uses `init()` to populate the shared `Generated` map at package initialization.

## Testing

```bash
go test ./internal/data/specialty/... -v
```
