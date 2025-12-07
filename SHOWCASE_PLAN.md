# Plan: psake Showcase Page Implementation

## Overview
Create a showcase page to highlight projects and organizations using psake for build automation, similar to the [Docusaurus showcase](https://docusaurus.io/showcase).

## 1. Data Structure & Schema

### Create Data File: `src/data/showcase.tsx`

Define TypeScript types and data structure:

```typescript
export type TagType =
  | 'favorite'      // Curated favorites by psake team
  | 'opensource'    // Open-source projects
  | 'commercial'    // Commercial/enterprise projects
  | 'cicd'          // CI/CD integration examples
  | 'dotnet'        // .NET projects
  | 'module'        // PowerShell module builds
  | 'large'         // Large projects (>100 tasks)
  | 'testing'       // Strong test automation

export type ShowcaseProject = {
  title: string;              // Project name
  description: string;        // Max 120 characters
  preview: string;            // Path to screenshot (640px min width)
  website: string | null;     // Project website/docs
  source: string;             // GitHub/GitLab repository
  tags: TagType[];           // Category tags
};

export const projects: ShowcaseProject[] = [
  // Initial seed projects
];
```

### Image Storage Structure
- Create directory: `static/img/showcase/`
- Naming convention: `{project-slug}.png` or `.jpg`
- Requirements: Min 640px width, max 2:1 aspect ratio
- Optimize images before adding (use build task)

## 2. Component Architecture

### 2.1 Main Page Component
**File:** `src/pages/showcase/index.tsx`

```typescript
export default function Showcase(): JSX.Element {
  return (
    <Layout title="Showcase" description="Projects built with psake">
      <ShowcaseHeader />
      <main className="margin-vert--lg">
        <ShowcaseFilters />
        <ShowcaseSearchBar />
        <ShowcaseCards />
      </main>
    </Layout>
  );
}
```

### 2.2 Sub-Components

**File:** `src/components/showcase/ShowcaseHeader.tsx`
- Title: "psake Showcase"
- Subtitle: "Discover projects built with psake"
- CTA button: "Submit Your Project" (links to GitHub discussion)

**File:** `src/components/showcase/ShowcaseFilters.tsx`
- Tag-based filtering (multi-select)
- AND/OR toggle for filter logic
- "Clear All" button
- Active filter count display

**File:** `src/components/showcase/ShowcaseSearchBar.tsx`
- Real-time search across title + description
- Fuzzy matching support
- Search result count

**File:** `src/components/showcase/ShowcaseCard.tsx`
- Project screenshot with hover effect
- Title (links to website or source)
- Description
- Tag badges
- GitHub link icon
- Website link icon (if available)

**File:** `src/components/showcase/ShowcaseCards.tsx`
- Grid layout (responsive: 1/2/3 columns)
- "Favorites" section first (if any favorites exist)
- "All Projects" section (alphabetically sorted)
- Empty state when no results

### 2.3 Styling
**File:** `src/components/showcase/styles.module.css`
- Card hover effects
- Tag badge colors
- Responsive grid layout
- Filter button styles
- Search input styling

## 3. Key Features Implementation

### 3.1 Filtering System
- Multi-tag selection (OR logic by default)
- Toggle between AND/OR filtering
- Persist filter state in URL query params
- Filter count badge

### 3.2 Search Functionality
- Case-insensitive search
- Search across: title, description, tags
- Real-time results update
- Combine with filters (AND logic)

### 3.3 Favorites Section
- Manually curated by psake maintainers
- Display prominently at top
- Larger card size option
- "Featured" badge/ribbon

### 3.4 Responsive Design
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Touch-friendly filter buttons

## 4. Integration with Existing Site

### 4.1 Navigation Updates
**File:** `docusaurus.config.ts`

Add to navbar items (line 89):
```typescript
{ to: '/showcase', label: 'Showcase', position: 'left' },
```

### 4.2 Footer Updates
Add to "Community" section (line 141):
```typescript
{
  label: 'Showcase',
  to: '/showcase',
},
```

### 4.3 Homepage Link
**File:** `src/pages/index.tsx`

Add CTA button or section linking to showcase

## 5. Submission Workflow

### 5.1 GitHub Discussion Setup
- Create GitHub Discussion category: "Showcase Submissions"
- Template for submissions:
  ```markdown
  **Project Name:**
  **Description:** (max 120 chars)
  **Website:** (optional)
  **Source Repository:**
  **Screenshot URL:** (upload to discussion)
  **Suggested Tags:**
  ```

### 5.2 Review Process
1. User submits via GitHub discussion
2. Maintainer reviews:
   - Validates project uses psake
   - Checks screenshot quality (640px min, 2:1 ratio)
   - Verifies links work
   - Optimizes image
3. Maintainer creates PR:
   - Adds entry to `src/data/showcase.tsx`
   - Adds optimized image to `static/img/showcase/`
   - Updates relevant tags

### 5.3 Image Optimization Task
**File:** `psakeFile.ps1`

Add new task:
```powershell
Task OptimizeShowcaseImages {
    # Use ImageMagick or similar to:
    # - Resize to max 1280px width
    # - Compress to <200KB
    # - Convert to WebP format (with fallback)
}
```

## 6. Build System Integration

### 6.1 Validation Task
**File:** `psakeFile.ps1`

```powershell
Task ValidateShowcase {
    # Check all images exist
    # Validate image dimensions
    # Ensure descriptions <= 120 chars
    # Verify all URLs are reachable
}
```

Add to `Test` task dependencies

### 6.2 Pester Tests
**File:** `tests/Showcase.Tests.ps1`

```powershell
Describe 'Showcase Data Validation' {
    It 'All projects have valid images' { }
    It 'All descriptions are <= 120 characters' { }
    It 'All source URLs are valid GitHub/GitLab links' { }
    It 'No duplicate project titles' { }
    It 'All tags are valid TagType values' { }
}
```

## 7. Content Strategy

### 7.1 Initial Seed Projects
Reach out to known psake users:
- psake itself (meta)
- Popular PowerShell modules using psake
- .NET projects with psake builds
- CI/CD pipeline examples

Target: 10-15 initial projects before launch

### 7.2 Tag Categories
- **favorite**: Maintainer-curated highlights (3-5 max)
- **opensource**: Public repositories
- **commercial**: Enterprise/product builds
- **cicd**: CI/CD integration showcases
- **dotnet**: .NET project builds
- **module**: PowerShell module automation
- **large**: Complex builds (>100 tasks)
- **testing**: Test automation examples

## 8. SEO & Metadata

### Page Metadata
```typescript
<Layout
  title="Showcase - Projects Built with psake"
  description="Discover real-world projects using psake for build automation in PowerShell, .NET, and CI/CD pipelines."
>
```

### Social Card
Create custom social card: `static/img/showcase-social-card.png`

## 9. Implementation Phases

### Phase 1: Core Structure (Day 1-2)
- [ ] Create data schema and initial file
- [ ] Build main page component
- [ ] Implement basic card grid
- [ ] Add to navigation

### Phase 2: Filtering & Search (Day 3-4)
- [ ] Implement tag filtering
- [ ] Add search functionality
- [ ] URL query param persistence
- [ ] Mobile responsive design

### Phase 3: Polish & Integration (Day 5)
- [ ] Favorites section
- [ ] Styling and animations
- [ ] Empty states
- [ ] Build system integration

### Phase 4: Validation & Launch (Day 6-7)
- [ ] Pester tests
- [ ] Documentation
- [ ] Seed initial projects
- [ ] GitHub discussion setup
- [ ] Deploy and announce

## 10. Future Enhancements

### Post-Launch Improvements
- **Community voting**: Let users upvote favorites
- **Sorting options**: By date added, popularity, name
- **Project stats**: Task count, lines of code, contributors
- **Category pages**: Dedicated pages per tag
- **RSS feed**: New showcase additions
- **Automated screenshots**: GitHub Action to capture screenshots
- **Rich previews**: Embed GitHub stats (stars, forks)

### Advanced Features
- **Web form submission**: Direct submission without GitHub account
- **Automated validation**: GitHub Action to validate PRs
- **Featured rotation**: Rotate featured projects monthly
- **Case studies**: Detailed write-ups for select projects

## 11. Success Metrics

Track after 3 months:
- Number of showcase projects (Target: 30+)
- Submission rate (Target: 2-3/month)
- Showcase page views
- Click-through to project repos
- Community engagement in discussions

---

## Dependencies

**NPM Packages** (already available):
- ✅ `clsx` - Conditional classnames
- ✅ `react` & `react-dom` - React framework
- ✅ TypeScript - Type safety

**No additional dependencies required!**

## Estimated Effort

- **Development**: 3-5 days
- **Testing & Polish**: 1-2 days
- **Seed Content**: 2-3 days (parallel)
- **Total**: ~1 week for MVP launch

## References & Sources

- [Docusaurus Site Showcase](https://docusaurus.io/showcase)
- [Docusaurus showcase/index.tsx](https://github.com/facebook/docusaurus/blob/main/website/src/pages/showcase/index.tsx)
- [Docusaurus showcase data structure](https://github.com/facebook/docusaurus/blob/main/website/src/data/users.tsx)
- [Showcase submissions discussion](https://github.com/facebook/docusaurus/discussions/7826)
- [Showcase infrastructure issue](https://github.com/facebook/docusaurus/issues/6882)

---

## Notes

This plan provides a complete roadmap for implementing a professional, scalable showcase page that will help grow the psake community by highlighting real-world usage and success stories.

The implementation can be done in stages following the phases outlined in Section 9, allowing for incremental development and testing.
