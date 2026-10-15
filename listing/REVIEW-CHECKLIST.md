# Figma review checklist

Based on Figma's "Plugin and widget review guidelines" (help.figma.com, article 360039958914), checked 15 Oct 2026. Figma says the guidelines change over time and aren't complete, so re-check them before submitting.

| Figma asks for | How we meet it | Status |
| --- | --- | --- |
| Two-factor authentication on the Figma account | Required by Figma to publish | To do before publishing |
| Cover image 1920 × 1080 (required), up to 9 screenshots/videos (optional) | Made from the real plugin after it's built | To do after building |
| Tested, no crashes or obvious bugs | Mock tests plus real Figma tests after every step (PROMPTS.md) | To do while building |
| No developer error messages to users | Every problem is in plain words (FORMAT.md) | In the design |
| Accurate description, screenshots or previews | listing/LISTING.md, plus screenshots or a short video | Text drafted; images to do |
| Documentation on how to use it | Instructions page on GitHub Pages (step 5) | To do in step 5 |
| Support contact | GitHub Issues | Ready once the repo is public |
| Privacy policy if user data is processed | listing/PRIVACY.md, also published on GitHub Pages | Drafted; get it checked |
| UI that matches Figma | Figma-native design, follows the Figma theme | In the design |
| Works offline, or tells the user when it can't | Needs no internet at all | In the design |
| Network access declared | manifest: `allowedDomains: ["none"]` | In CLAUDE.md |
| Only official plugin APIs | Plugin API only, nothing to install | In CLAUDE.md |
| No ads | None | In the design |
| No general AI chat or own-API-key AI | No AI inside the plugin | In the design |
| Not a workaround to Figma's paid plans | Free plan gets one mode, no workaround | In FORMAT.md |
| Doesn't recreate Figma's own features (Figma agent, MCP server) | **Risk.** Building designs from AI-written files overlaps with Figma's AI tools. Describe the plugin as building from a JSON file you can write any way, not as a replacement for Figma's AI. | Can't be fully removed |

## Facts for the security disclosure form

Figma encourages filling this in when publishing. Answer its questions with these facts:

- The plugin makes no network requests (`allowedDomains: ["none"]` in the manifest).
- It collects, stores and shares no user data. No accounts, analytics or tracking.
- It reads the open file only to look up names, and changes it only when the user presses Build.
- The code is open on GitHub: https://github.com/adnnankhan/dropkit

## If Figma rejects it

- Read the reason in Figma's email, fix it, and submit again. Figma allows this.
- Meanwhile, people can still use it from GitHub: download the latest release, then in the Figma desktop app use Plugins → Development → Import plugin from manifest. It works in the desktop app only, and updates aren't automatic.
