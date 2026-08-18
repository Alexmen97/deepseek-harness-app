# Agent Note: M4 coding experience surfaces

Status: implemented

English | [中文](2026-08-18-m4-coding-experience-surfaces.zh.md)

## Problem

Harness Desktop was a conversation-first client: files, working-tree changes, terminals, plans, jobs, and subagents had no dedicated desktop surface, and the runtime architecture forbids generic file or exec IPC.

## Decision

The desktop overlay gains a collapsible Inspector with six sections. Files and Changes use narrow read-only host capabilities (fs_list, fs_read_text, reveal_in_path, git_status, git_diff) bounded to the runtime workspace; the terminal is an xterm frontend over new desktop.terminal.* protocol methods served by the Harness terminal service with the bash PTY backend mounted in the runtime composition; Plan, Jobs, and Subagents render structured upstream state from the events.mux frames (session/projection for plan, session/jobs snapshots, subagent lineage from session/event). Only the open tab and visibility persist, in prefs.json. The terminal seam gains an optional resize member (upstream patch four).

## Alternatives considered

### Why not route files and git through the Harness services?

The harness filesystem and subprocess services are agent-execution surfaces; a viewer does not need their permission model, and exposing them over new RPC would widen the wire more than a bounded host listing.

### Why not parse plans from assistant prose?

Only the structured plan projection is rendered; prose inference would fabricate state the session log does not own.

## Consequences

- The WebView gains no generic read/write/exec primitive; every new surface stays bounded to the workspace and render-only.
- 42 new desktop strings ship in all seven locales with the coverage gate unchanged.
- Tests pin the host containment/caps, the diff parser, and the projection store including generation isolation.
