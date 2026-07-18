<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-notes -->
## Project Notes

### File editing: Use Node.js script

edit_file silently fails (Windows + CJK + CRLF). PowerShell replace is unreliable.
Use: write_file to create _fix.js, then node _fix.js, then git add/commit/push.
Never use echo >> script.js (backslash quotes break).
<!-- END:project-notes -->
