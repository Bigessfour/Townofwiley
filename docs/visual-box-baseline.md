# Visual Box Baseline: What Right Should Look Like

This is the target standard for the Town of Wiley visual-box audit. It turns the audit from a subjective screenshot review into a professional civic-website checklist: clear hierarchy, predictable spacing, accessible controls, responsive layout, and calm resident-service usability.

Use this baseline in phases: Phase 1 focuses on the typography scale, spacing tokens, PrimeNG theme consistency, heading audit, reduced-motion support, and print-safe public records; Phase 2 adds full visual regression tooling such as Percy, Applitools, or an equivalent screenshot-diff workflow.

## Source Standards

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/): use WCAG AA as the minimum accessibility bar, especially contrast, reflow, focus, headings, labels, keyboard access, and target size.
- [Nielsen Norman Group visual hierarchy guidance](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/): use contrast, scale, grouping, proximity, and the squint test to confirm the page’s intended reading order.
- [GOV.UK Design System spacing](https://design-system.service.gov.uk/styles/spacing/): use a responsive spacing scale so small screens are tighter and large screens breathe without becoming sparse.
- [U.S. Web Design System spacing units](https://designsystem.digital.gov/design-tokens/spacing-units/): favor an 8px-based spacing system with named tokens instead of one-off pixel values.
- [U.S. Web Design System button guidance](https://designsystem.digital.gov/components/button/): reserve buttons for important actions, keep labels short and verb-led, preserve focus states, and use standard button/link semantics.
- [web.dev responsive design course](https://web.dev/learn/design/): cover macro layout, micro layout, typography, images, theming, accessibility, interaction, and screen configurations across device sizes.

## North Star

A resident should know where they are, what matters most, and what to do next within the first few seconds of viewing any page. The site should feel official and approachable: practical, calm, bilingual, readable, and easy to scan on a phone.

## Professional Acceptance Targets

### Layout And Box Model

- No horizontal page overflow at 390px, 768px, 1024px, 1280px, or 1440px widths.
- Major regions are visually distinct without nested card clutter: header, page hero, primary content, supporting content, and footer should be obvious in the box-outline view.
- Page sections use a repeatable vertical rhythm. Related heading/content pairs sit close together; unrelated sections get visibly larger separation.
- Cards are used for repeated items or framed tools, not as decorative wrappers around whole page sections.
- Important controls stay in the first screen without crowding the brand, navigation, language switcher, or search.

### Visual Hierarchy

- Each page has one clear visual priority. On public pages, the page title and primary resident action should win the squint test.
- Use no more than three dominant text sizes in normal content areas: page title, section title, and body/supporting text.
- Avoid making many elements equally loud. If everything is bold, bordered, saturated, or oversized, the page fails hierarchy.
- Color supports hierarchy but never carries meaning alone.
- Warnings, errors, urgent weather, and public notices may use stronger color, but routine content should stay restrained.

### Typography

- Body copy is readable at normal zoom and survives 200% text zoom without loss of content or function.
- Headings follow semantic order and visual order: one `h1`, then ordered `h2`/`h3` sections without skipped levels unless a component is intentionally nested.
- Line height is generous enough for scanning civic content: tighter for headings, comfortable for paragraphs and list items.
- No negative letter spacing in normal headings or UI labels.
- Long Spanish labels and town-service phrases wrap cleanly without clipping or overlapping.

### Spacing Rhythm

- Component spacing should map to tokens, preferably an 8px rhythm for local spacing and responsive larger tokens for page sections.
- Small repeated elements use compact spacing; sections use stronger vertical separation.
- Mobile spacing should compress deliberately rather than simply shrinking every desktop gap.
- Adjacent panels should not visually merge unless they are one logical group.
- Lists, cards, buttons, and form fields should align to a consistent internal padding pattern.

### PrimeNG And Component Consistency

- PrimeNG buttons, cards, panels, tabs, select buttons, inputs, and timelines should look like one local theme, not vendor defaults mixed with custom CSS.
- Focus, hover, active, disabled, and selected states must be visible and consistent.
- Buttons are for actions; links are for navigation. Links styled as buttons still need correct link behavior and accessible names.
- Primary actions should be visually distinct, but each page should avoid button overload.
- Component borders, radii, shadows, and surfaces should use the Town of Wiley token vocabulary.

### Accessibility Minimums

- WCAG 2.2 AA is the baseline: keyboard access, visible focus, contrast, reflow, headings/labels, link purpose, input labels, and status messages.
- Text contrast should meet at least 4.5:1 for normal text and 3:1 for large text and non-text UI indicators.
- Interactive targets should meet WCAG 2.2 AA minimum target size of 24 by 24 CSS pixels, with 44 by 44 CSS pixels preferred for primary mobile controls.
- Focused elements must not be fully hidden by sticky headers or overlays.
- Weather alerts, banners, shimmer loading states, and transitions should respect `prefers-reduced-motion`.
- Language switching should be easy to find and preserve clear English/Spanish state.

### Responsive Behavior

- At mobile width, header content must stack predictably: brand first, navigation/search/language controls grouped without overlap, and no clipped labels.
- At tablet width, grids may move from one column to two columns only when card content remains balanced.
- At desktop width, content should not stretch into long unreadable lines; page shells need max-width constraints.
- Dense tools such as weather, records, services, meetings, and calendars should remain scannable before decorative presentation is considered successful.
- Responsive screenshots should be checked in English and Spanish.

### Civic Content Quality

- The homepage should prioritize resident tasks: notices, meetings, weather, payments/services, records, contact, and language access.
- Repeated task/feature sections should either be consolidated or made visually distinct enough that residents understand why both exist.
- Page titles, card titles, and button labels should be direct and resident-centered.
- Important public-service information should not be buried below decorative sections.
- Agendas, notices, records, and document listings should print cleanly on letter-size paper without horizontal overflow.

## Visual-Box Audit Method

Run the audit with temporary outlines on all visible boxes, then review both screenshots and automated geometry output.

Passing pages should show:

- A clean page skeleton when outlined.
- No unexpected offscreen boxes or horizontal overflow.
- No clipped meaningful text except intentional truncation, such as calendar event titles where full detail is available elsewhere.
- One `h1` and no unexplained heading jumps.
- Tap targets that are large enough for touch and not packed tightly together.
- Clear grouping between related controls and content.
- Print-preview geometry for agendas, notices, records, and documents fits within letter-size page width.

The squint-test review should answer three questions:

1. What is this page about?
2. What is the resident supposed to do first?
3. Does the visual weight match the civic importance of the content?

## Baseline Scorecard

Use this scorecard for each audited page:

| Category         | Pass Target                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| Layout           | No overflow, no overlap, no accidental offscreen content                   |
| Hierarchy        | One obvious page purpose and one primary next action                       |
| Typography       | Ordered headings, readable scale, no clipped bilingual text                |
| Spacing          | Tokenized rhythm, clear grouping, no cramped control clusters              |
| Components       | PrimeNG controls share theme states and semantics                          |
| Accessibility    | WCAG AA checks pass for contrast, keyboard, focus, labels, and target size |
| Responsive       | Mobile, tablet, and desktop preserve content order and usability           |
| Print            | Agendas, notices, records, and documents fit letter-size print layouts     |
| Civic usefulness | High-priority resident tasks are easy to find and act on                   |

## Current Improvement Threshold

For this phase, a page is considered ready when it passes the automated visual-box checks, passes manual outline/squint review at desktop and mobile widths, and has no obvious mismatch between semantic structure and visual hierarchy.

Pages that pass geometry but feel crowded, visually repetitive, or unclear should stay in the improvement queue. The goal is not merely valid layout; the goal is a civic site that feels trustworthy, easy, and professionally maintained.
