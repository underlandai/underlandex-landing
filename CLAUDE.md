# UnderlandEX Homepage Project Guide

## Git Preferences
- **Commit Messages**: Use concise, descriptive commit messages without Claude attribution
- **Commit Format**: 
  - Start with a clear summary line
  - Add bullet points for details using hyphens
  - No Claude attribution or co-authoring

## Commands
- Build production: `docker-compose up -d --build`
- Local development: `docker-compose -f /Users/olivermowbray/python/Lichen-Homepage-2/docker-compose-dev.yml up -d` or `npm run dev`
- Check code: `npm run check` (runs astro, eslint, prettier checks)
- Fix issues: `npm run fix` (fixes eslint and prettier issues)
- Preview build: `npm run preview`
- Type check: `npm run check:astro`

## Docker
- Production: Uses multi-stage build with nginx for serving (port 8080)
- Development: `docker-compose-dev.yml` runs dev server on http://localhost:4321/
- Visual inspection: Always check http://localhost:4321/ after major changes

## Code Style
- **TypeScript**: Use strict typing
- **Formatting**: 2-space indentation
- **Naming**: PascalCase for components, camelCase for variables
- **Unused Variables**: Prefix with `_` to ignore (e.g., `_unusedVar`)
- **Error Handling**: Follow typescript-eslint patterns
- **Components**: Follow Astro component patterns
- **CSS**: Use Tailwind classes with consistent ordering

## Project Structure
- `/src/components`: UI components (widgets, blog, common, ui)
- `/src/pages`: Astro pages define routes
- `/src/assets`: Images and styles
- `/src/content`: Blog posts and content
- Config in `src/config.yaml` and `astro.config.ts`