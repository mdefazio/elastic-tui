# elastic-tui zsh integration
#
# Wraps `elastic tui` so that a command "sent to the terminal" from the TUI
# lands on your prompt, editable, instead of just printing above it.
#
# Install: add this to your ~/.zshrc (or `source` this file from it):
#
#   source /path/to/elastic-tui/shell/elastic-tui.zsh
#
# Then run `etui` instead of `elastic tui`.

etui() {
  local f
  f=$(mktemp) || return 1
  ELASTIC_TUI_EMIT_FILE="$f" elastic tui "$@"
  local cmd
  cmd=$(<"$f")
  rm -f "$f"
  # `print -z` pushes text onto the next prompt's editing buffer.
  [[ -n $cmd ]] && print -z -- "$cmd"
}
