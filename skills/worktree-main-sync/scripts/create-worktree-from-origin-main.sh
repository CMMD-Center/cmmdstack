#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  $(basename "$0") --branch <branch-name> --path <worktree-path> [--remote origin] [--base main]

Example:
  $(basename "$0") --branch feat/my-feature --path ../my-feature-worktree
USAGE
}

branch=""
worktree_path=""
remote="origin"
base="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      branch="${2:-}"
      shift 2
      ;;
    --path)
      worktree_path="${2:-}"
      shift 2
      ;;
    --remote)
      remote="${2:-}"
      shift 2
      ;;
    --base)
      base="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$branch" || -z "$worktree_path" ]]; then
  usage
  exit 1
fi


repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Error: run this command inside a git repository." >&2
  exit 1
fi

cd "$repo_root"

echo "Fetching latest refs from $remote..."
git fetch --prune "$remote"

if ! git show-ref --verify --quiet "refs/remotes/$remote/$base"; then
  echo "Error: remote ref '$remote/$base' not found." >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "Error: local branch '$branch' already exists." >&2
  exit 1
fi

if git ls-remote --exit-code --heads "$remote" "$branch" >/dev/null 2>&1; then
  echo "Error: remote branch '$remote/$branch' already exists." >&2
  exit 1
fi

if [[ -e "$worktree_path" ]]; then
  echo "Error: worktree path already exists: $worktree_path" >&2
  exit 1
fi

echo "Creating worktree '$worktree_path' from '$remote/$base' on branch '$branch'..."
git worktree add -b "$branch" "$worktree_path" "$remote/$base"

pushd "$worktree_path" >/dev/null
counts="$(git rev-list --left-right --count HEAD..."$remote/$base")"
ahead="${counts%%[[:space:]]*}"
behind="${counts##*[[:space:]]}"
popd >/dev/null

echo "Worktree ready: $worktree_path"
echo "Branch: $branch"
echo "Parity vs $remote/$base -> behind=$behind ahead=$ahead"
if [[ "$behind" != "0" || "$ahead" != "0" ]]; then
  echo "Warning: new worktree is not at parity with $remote/$base." >&2
  exit 2
fi
