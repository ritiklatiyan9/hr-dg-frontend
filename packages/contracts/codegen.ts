export default {
  schema: "packages/contracts/schema.graphql",
  documents: "packages/contracts/operations.graphql",
  generates: {
    "packages/contracts/src/generated.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: {
        useTypeImports: true,
        scalars: { DateTime: "string", Decimal: "string", JSON: "unknown" },
        strictScalars: true,
      },
    },
  },
};
