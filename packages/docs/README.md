# @sidequest/docs

Documentation website for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package contains the complete documentation website for Sidequest.js, built with VitePress. It provides comprehensive guides, API references, examples, and tutorials for using Sidequest in production applications.

The documentation covers:

- **Installation & Setup** - Getting started with different backends
- **Job Management** - Creating, running, and managing jobs
- **Queue Configuration** - Setting up and configuring job queues
- **Engine Configuration** - Advanced engine setup and options
- **Dashboard Usage** - Web-based monitoring and management
- **CLI Tools** - Command-line interface for migrations and setup
- **Development Guide** - Contributing to the Sidequest project

The live documentation is hosted at **[https://docs.sidequestjs.com](https://docs.sidequestjs.com)**.

## Development Instructions

### Prerequisites

- Node.js 22.6.0 or higher
- Yarn 4.x (with Corepack enabled)

### Local Development

1. **Clone and setup the monorepo:**

   ```bash
   git clone https://github.com/sidequestjs/sidequest.git
   cd sidequest
   corepack enable
   yarn install
   ```

2. **Start the development server:**

   ```bash
   cd packages/docs
   yarn dev
   ```

   The documentation will be available at `http://localhost:5173`

3. **Make your changes:**
   - Edit markdown files in the `packages/docs/` directory
   - The site will automatically reload when files change
   - Preview your changes in the browser

### Available Scripts

- **`yarn dev`** - Start development server with hot reload
- **`yarn build`** - Build the static site for production
- **`yarn preview`** - Preview the built site locally

### Writing Documentation

1. **Use VitePress markdown features:**
   - Frontmatter for page metadata
   - Code blocks with syntax highlighting
   - Custom containers (info, warning, danger)
   - Internal linking

2. **Follow the style guide:**
   - Use clear, concise language
   - Include practical examples
   - Add code snippets for complex concepts
   - Use proper heading hierarchy

3. **Example page structure:**

   Use the following template for new documentation pages:

   ```markdown
   ---
   outline: deep
   title: Page Title
   description: Page description for SEO
   ---

   # Page Title

   Brief introduction paragraph.

   ## Main Section

   Content with examples and code snippets.

   ## Another Section

   More content...
   ```

### Adding New Pages

1. Create a new markdown file in the appropriate directory
2. Add frontmatter with title and description
3. Update the sidebar configuration in `.vitepress/config.mts`
4. Test the navigation and internal links

### Deployment

The documentation is automatically deployed to [docs.sidequestjs.com](https://docs.sidequestjs.com) when changes are pushed to the main branch. The deployment process:

1. GitHub Actions builds the site using `yarn build`
2. Static files are deployed to the hosting platform
3. CDN cache is invalidated for immediate updates

### Contributing

1. Fork the repository
2. Create a feature branch for your documentation changes
3. Make your changes following the writing guidelines
4. Test locally using `yarn dev`
5. Submit a pull request with a clear description

For questions about documentation, please open an issue in the main repository.

## License

LGPL-3.0-or-later
