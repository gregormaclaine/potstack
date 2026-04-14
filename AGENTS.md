<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TypeScript

Never use `any`. All types must be explicit or properly inferred — no `as any`, no `: any`, no `(x: any)` parameters. Use precise types, Prisma-generated types, or `unknown` with narrowing if the shape is genuinely unknown.

# Planning

For any feature that requires a long planning stage, create a markdown file in the `planning/` directory to document the plan before writing any code. The file should outline the approach, key decisions, and implementation steps.
