# Cardity Registry

Cardity Registry is a static, machine-readable ecosystem index. It does not
execute protocols, install packages, or approve writes. It points runtimes and
agents to official templates, schemas, runtime adapter declarations,
compatibility badges, and package examples.

## Hosted URLs

```text
https://api.cardity.org/registry
https://api.cardity.org/registry/catalog.json
https://api.cardity.org/registry/templates
https://api.cardity.org/registry/templates/member_points
https://api.cardity.org/registry/schemas
https://api.cardity.org/registry/runtime_adapters
https://api.cardity.org/registry/runtimes
https://api.cardity.org/registry/badges
https://api.cardity.org/registry/packages
```

Source of truth:

```text
registry/catalog.json
```

Schema:

```text
https://api.cardity.org/schemas/ecosystem_registry_v1.schema.json
```

## CLI

```bash
cardity registry
cardity registry templates
cardity registry templates member_points
cardity registry packages member-points-system
```

## MCP

Tool:

```text
cardity_ecosystem_registry
```

Inputs:

```json
{}
```

```json
{
  "collection": "templates",
  "id": "member_points"
}
```

## Runtime Use

Downstream runtimes can use the registry to:

1. Discover official templates.
2. Resolve stable schema URLs.
3. Find runtime adapter examples.
4. Embed compatibility badges.
5. Build `.carditypkg` examples from standard commands.

The registry remains a catalog. Runtimes should still run Cardity conformance
before consuming a manifest or package.
