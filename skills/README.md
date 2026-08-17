# KTRouter — Agent Skills

Drop-in skills for any AI agent (Claude, Cursor, ChatGPT, custom SDK). Just **copy a link** below and paste it to your AI — it will fetch the skill and use KTRouter for you.

> Tip: start with the **ktrouter** entry skill — it covers setup and links to all capability skills.

## Skills

| Capability | Copy link below and paste to your AI |
|---|---|
| **Entry / Setup** (start here) | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter/SKILL.md |
| Chat / code-gen | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-chat/SKILL.md |
| Image generation | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-image/SKILL.md |
| Video generation (xAI Grok Imagine) | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-video/SKILL.md |
| Text-to-speech | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-tts/SKILL.md |
| Speech-to-text | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-stt/SKILL.md |
| Embeddings | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-embeddings/SKILL.md |
| Web search | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-web-search/SKILL.md |
| Web fetch (URL → markdown) | https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter-web-fetch/SKILL.md |

## How to use

Paste to your AI (Claude, Cursor, ChatGPT, …):

```
Read this skill and use it: https://raw.githubusercontent.com/dongbao492/ktrouter/refs/heads/main/skills/ktrouter/SKILL.md
```

Then ask normally — *"generate an image of a cat"*, *"transcribe this URL"*, etc.

## Configure your shell once

```bash
export KTROUTER_URL="http://localhost:3008"   # local default, or your VPS / tunnel URL
export KTROUTER_KEY="sk-..."                   # from Dashboard → Keys (only if requireApiKey=true)
```

Verify: `curl $KTROUTER_URL/api/health` → `{"ok":true}`.

## Links

- Source: https://github.com/dongbao492/ktrouter
- Dashboard: https://ktrouter.com
