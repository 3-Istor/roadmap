{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    prisma-engines
  ];

  PRISMA_QUERY_ENGINE_LIBRARY =
    "${pkgs.prisma-engines}/lib/libquery_engine.node";

  PRISMA_QUERY_ENGINE_BINARY =
    "${pkgs.prisma-engines}/bin/query-engine";

  PRISMA_SCHEMA_ENGINE_BINARY =
    "${pkgs.prisma-engines}/bin/schema-engine";

  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";

  shellHook = ''
    unset PROMPT_COMMAND
    unset __vsc_prompt_cmd_original 2>/dev/null || true
  '';
}