Finds files in the current workspace by name or path and puts them into the chat. Every word you type has to appear somewhere in the path, so `paseo usage` finds `memory/facts/paseo-usage.md` and nothing else; there is no fuzzy matching, and Korean works. Matching folders are listed first with a trailing slash; words that hit the file name rank above words that only hit a folder.

A "참조 검색" pill sits above the chat box. Its popover searches as you type; arrow keys move the selection, and Enter or a click puts the pick into the chat box as a quoted path, the same text Paseo's `@` mention inserts. "열기" on a file row opens it in Paseo's own file tab instead. A brand-new session has no agent yet, and Paseo shows no plugin pills there, so the pill appears once the first message is sent.

The same search also lists up to five other sessions on the same host whose title has every word, most recently used first. Picking one inserts `[Paseo 세션 "title" agentId=…]`, so the agent can hand work to that session or ask it something with Paseo's `send_agent_prompt` tool. The id keeps working when the title changes; the plugin only inserts the text and sends nothing itself.

On desktop and web, a shortcut (`Cmd+Shift+O` by default, changeable or switchable off under Options; a single character there becomes a typed trigger instead) opens the popover from anywhere in a workspace. The phone apps cannot drive the chat box or the file tab, so a pick copies the path there.

The file list honours .gitignore and skips hidden entries. It comes from ripgrep when it is installed on the daemon machine, else from git, else from a plain directory walk, and is refreshed every ten seconds. Requires Paseo 0.13 or later.
