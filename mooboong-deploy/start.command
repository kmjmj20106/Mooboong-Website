#!/bin/zsh
set -e
cd "${0:A:h}"
runtime_node="$(command -v node || true)"
runtime_python="$(command -v python3 || true)"
bundled_base="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if [[ -x "$bundled_base/node/bin/node" ]]; then
  runtime_node="$bundled_base/node/bin/node"
fi
if [[ -x "$bundled_base/python/bin/python3" ]]; then
  runtime_python="$bundled_base/python/bin/python3"
fi
if [[ -z "$runtime_node" || -z "$runtime_python" ]]; then
  print '실행하려면 Node.js 24 이상과 Python 3.10 이상이 필요합니다.'
  read '?Enter 키를 누르면 닫힙니다. '
  exit 1
fi
export PYTHON_BIN="$runtime_python"
exec "$runtime_node" launch.mjs
