Finds files in the current workspace by name or path. Every word you type has to appear somewhere in the path, so `paseo usage` finds `memory/facts/paseo-usage.md` and nothing else; there is no fuzzy matching, and Korean works. Words that hit the file name rank above words that only hit a folder.

Open it from the Explorer sidebar as the "파일 검색" tab, or from Cmd+K ("파일 검색"). Enter opens the first result; clicking a row opens that file in Paseo's own file tab. On the phone apps, where the file tab cannot be driven, the path is copied instead.

The same search sits in the composer's attach menu as "파일 검색", a stand-in for `@`, which plugins cannot extend. It searches every open workspace on the host; a picked file becomes a chip, and the agent receives the quoted absolute path, the same kind of reference the `@` mention sends.

The file list honours .gitignore and skips hidden entries. It comes from ripgrep when it is installed on the daemon machine, else from git, else from a plain directory walk, and is refreshed every ten seconds. Requires Paseo 0.13 or later.
