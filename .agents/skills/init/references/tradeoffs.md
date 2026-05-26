# Tradeoff Tables for Init Skill Phase 2

Load the relevant table when a conditional trigger fires. Present options
with tradeoffs, then ask the user to choose.

## Python Env Manager

| Tool       | Speed   | Conda-compat | Notes                                              |
| ---------- | ------- | ------------ | -------------------------------------------------- |
| **pixi**   | Fast    | Yes          | Rust-based, conda-compatible, modern               |
| **mamba**  | Fast    | Yes          | C++ reimplementation of conda, drop-in replacement |
| **uv**     | Fastest | No           | pip-compatible, fastest resolver                   |
| **poetry** | Medium  | No           | Lock file, build system, mature                    |
| **conda**  | Slow    | Yes          | Heavy but full scientific stack                    |

## Python Testing

| Tool         | Style          | Notes                                          |
| ------------ | -------------- | ---------------------------------------------- |
| **pytest**   | Function-based | Rich plugins, parametrize, fixtures — standard |
| **unittest** | Class-based    | Built-in, no deps — verbose                    |

## Python Linter

| Tool       | Speed   | Scope                                        |
| ---------- | ------- | -------------------------------------------- |
| **ruff**   | Fastest | Linter + formatter, drop-in for flake8/isort |
| **pylama** | Medium  | Wraps pylint/pycodestyle/pydocstyle          |

## Runtime Version Manager

Applies to any language after runtime is chosen.

| Tool       | Languages                         | Config                | Notes                                 |
| ---------- | --------------------------------- | --------------------- | ------------------------------------- |
| **mise**   | Node, Python, Go, Ruby, Java, ... | `mise.toml`           | Rust-based polyglot, faster than asdf |
| **fnm**    | Node.js                           | `.node-version`       | Fast, Rust-based nvm alternative      |
| **nvm**    | Node.js                           | `.nvmrc`              | Most mature Node version manager      |
| **volta**  | Node.js                           | `package.json` pinned | Auto-switches, fast install           |
| **pyenv**  | Python                            | `.python-version`     | Standard Python version manager       |
| **gvm**    | Go                                | Bash script           | Go version manager                    |
| **rustup** | Rust                              | TOML                  | Official Rust toolchain installer     |

## Data Analysis — Notebook Env

| Tool            | Strengths                                     | Best for                |
| --------------- | --------------------------------------------- | ----------------------- |
| **Quarto**      | Publication-grade docs, multi-format, VS Code | Reports, papers, books  |
| **Marimo**      | Reactive, reproducible, no hidden state       | Exploratory, dashboards |
| **Jupyter Lab** | Extensible, familiar, largest ecosystem       | General, legacy         |

## Data Analysis — Viz Lib

| Lib            | Use case                                      |
| -------------- | --------------------------------------------- |
| **matplotlib** | Low-level, total control, publication figures |
| **plotly**     | Interactive, zoom/hover, web-friendly         |
| **altair**     | Declarative, statistical, Vega-Lite grammar   |

## Data Analysis — Data Libs

| Lib        | Use case                                   |
| ---------- | ------------------------------------------ |
| **pandas** | Tabular, mature, widest ecosystem          |
| **polars** | Fast, lazy eval, no index — 10-100x faster |
| **numpy**  | Array ops, numerical, foundation layer     |

## Web API — Style

| Style       | Typesafe | Schema-driven    | Best for                          |
| ----------- | -------- | ---------------- | --------------------------------- |
| **REST**    | Medium   | OpenAPI          | General, broadest ecosystem       |
| **GraphQL** | High     | Schema-first     | Complex queries, multiple clients |
| **tRPC**    | Full     | No schema needed | Fullstack TypeScript only         |
| **gRPC**    | Full     | Protobuf         | Microservices, polyglot           |

## Web API — Auth

| Method       | Complexity | Use case                           |
| ------------ | ---------- | ---------------------------------- |
| **JWT**      | Medium     | Stateless, mobile/web, most common |
| **Sessions** | Low        | Server-rendered apps, simple       |
| **OAuth**    | High       | Third-party login, enterprise      |

## Database — ORM

| ORM            | Type          | Size  | Migration           |
| -------------- | ------------- | ----- | ------------------- |
| **Prisma**     | Declarative   | Heavy | Built-in, push/pull |
| **Drizzle**    | SQL-like      | Light | drizzle-kit         |
| **SQLAlchemy** | Full-featured | Heavy | Alembic             |
| **raw SQL**    | None          | Zero  | Manual              |

## CLI Tool — Args Parser

| Parser        | Language | Notes                      |
| ------------- | -------- | -------------------------- |
| **commander** | Node.js  | Subcommands, help auto-gen |
| **click**     | Python   | Decorators, composable     |
| **cobra**     | Go       | Widely used, subcommands   |

## Fullstack — Monorepo

| Tool                | Features                            |
| ------------------- | ----------------------------------- |
| **turborepo**       | Caching, parallel, Vercel           |
| **nx**              | Generators, affected graph, plugins |
| **pnpm workspaces** | Light, native workspace protocol    |

## Next.js — Router

| Option           | Use case                              |
| ---------------- | ------------------------------------- |
| **App Router**   | New projects, RSC, layouts, streaming |
| **Pages Router** | Legacy, simpler data fetching         |

## CI/CD — Platform

| Platform         | Style            | Best for                                       |
| ---------------- | ---------------- | ---------------------------------------------- |
| **Vercel**       | Serverless       | Frontend, Next.js                              |
| **Railway**      | PaaS             | Fast deploys, DB included                      |
| **Coolify**      | Self-hosted PaaS | Full control, no vendor lock, one-click deploy |
| **Docker + k8s** | Container        | Full control, scale                            |
| **AWS/GCP**      | Cloud            | Enterprise, services                           |
