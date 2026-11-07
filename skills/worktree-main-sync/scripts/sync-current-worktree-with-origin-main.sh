#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  $(basename "$0") [--remote origin] [--base main] [--rebase]

Default behavior:
  - fetch latest refs
  - if branch is behind remote base and has no local commits, fast-forward merge
  - if local commits exist, exits with guidance unless --rebase is set
USAGE
}

remote="origin"
base="main"
use_rebase="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)
      remote="${2:-}"
      shift 2
      ;;
    --base)
      base="${2:-}"
      shift 2
      ;;
    --rebase)
      use_rebase="true"
      shift
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

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: run inside a git repository." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

echo "Fetching latest refs from $remote..."
git fetch --prune "$remote"

if ! git show-ref --verify --quiet "refs/remotes/$remote/$base"; then
  echo "Error: remote ref '$remote/$base' not found." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash changes before syncing." >&2
  exit 1
fi

counts="$(git rev-list --left-right --count HEAD..."$remote/$base")"
ahead="${counts%%[[:space:]]*}"
behind="${counts##*[[:space:]]}"

echo "Before sync ($branch vs $remote/$base): behind=$behind ahead=$ahead"

if [[ "$behind" == "0" ]]; then
  echo "Already up to date with $remote/$base."
  exit 0
fi

if [[ "$use_rebase" == "true" ]]; then
  echo "Rebasing '$branch' onto '$remote/$base'..."
  git rebase "$remote/$base"
else
  echo "Trying fast-forward merge from '$remote/$base'..."
  if ! git merge --ff-only "$remote/$base"; then
    echo "Fast-forward not possible. Re-run with --rebase to replay local commits on top of $remote/$base." >&2
    exit 1
  fi
fi

counts_after="$(git rev-list --left-right --count HEAD..."$remote/$base")"
ahead_after="${counts_after%%[[:space:]]*}"
behind_after="${counts_after##*[[:space:]]}"

echo "After sync: behind=$behind_after ahead=$ahead_after"
