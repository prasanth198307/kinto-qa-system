# Design Guidelines for KINTO QA Management System

## Design Approach

**System Foundation:** Professional enterprise design inspired by Meta Business Suite, optimized for manufacturing QA workflows with mobile-first execution.

**Design Philosophy:** Clean, clear interface with Meta Business-inspired fonts and backgrounds. Prioritize clarity, readability, and data visibility with crisp typography and high contrast. Design for both desktop administrators and mobile operators in manufacturing environments.

## Color System (Meta Business-Inspired)

### Primary Colors
- **Primary Blue:** `#1877F2` (Meta Blue) - Main brand color for buttons, links, active states
- **Primary Blue Dark:** `#166FE5` - Hover states for primary elements
- **Light Blue:** `#E7F3FF` - Backgrounds, subtle highlights
- **Accent Blue:** `#0866FF` - Interactive elements

### Neutral Colors (High Clarity)
- **Background:** `#FAFAFA` - Page background (very light gray for comfort)
- **Card/Surface:** `#FFFFFF` - Cards, panels, elevated surfaces (pure white)
- **Border:** `#E4E6EB` - Dividers, card borders (subtle)
- **Text Primary:** `#050505` - Main content text (high contrast black)
- **Text Secondary:** `#65676B` - Supporting text
- **Text Muted:** `#8A8D91` - Less important text

### Status Colors
- **Success/Pass:** `#31A24C` (green) - Approved items, passed tasks
- **Warning:** `#E39E24` (yellow) - Pending items, warnings
- **Error/Fail:** `#E84545` (red) - Failed tasks, errors, critical items
- **Info:** `#1877F2` (blue) - Informational states

## Typography System (Meta Business-Inspired)

**Font Stack:**
- Primary: "Segoe UI" (Windows), -apple-system (macOS), BlinkMacSystemFont, "Helvetica Neue", Roboto, system-ui, Arial
- Fallback: sans-serif
- **Letter Spacing:** -0.011em (tighter for cleaner look)
- **Heading Letter Spacing:** -0.022em
- **Font Smoothing:** Antialiased for crisp rendering

**Hierarchy:**
- Page Titles: text-3xl (30px) font-bold text-gray-900
- Section Headers: text-2xl (24px) font-semibold text-gray-800
- Card Titles: text-lg (18px) font-semibold text-gray-900
- Subsections: text-base (16px) font-medium text-gray-800
- Body Text: text-sm (14px) font-normal text-gray-700
- Captions/Labels: text-xs (12px) font-medium text-gray-600
- Buttons: text-sm (14px) font-medium

## Layout System

### Spacing Units
- **Tight spacing:** 2, 4 (gaps between related elements)
- **Normal spacing:** 6, 8 (component padding, section gaps)
- **Loose spacing:** 12, 16, 20 (major section separation)

### Container Strategy
- **Landing Page:** Centered card (max-w-md) with gradient background
- **Role Selector:** Grid layout (max-w-4xl) centered, 2x2 on desktop, 1 column on mobile
- **Admin Dashboards:** Full width with max-w-7xl centered
- **Forms/Dialogs:** max-w-2xl for optimal readability
- **Mobile:** Full width with px-4 side padding

## Components

### Landing Page
**Layout:**
- Gradient background: `bg-gradient-to-br from-blue-50 to-white`
- Centered white card: `max-w-md mx-auto shadow-xl rounded-lg`
- Card padding: `p-8`
- Logo/Title at top with generous spacing
- Prominent "Log in with Replit" button (primary blue, full width)

**Elements:**
- Title: text-2xl font-bold text-gray-900
- Subtitle: text-sm text-gray-600
- Button: bg-blue-600 hover:bg-blue-700 w-full py-3 rounded-lg

### Role Selector
**Layout:**
- Grid: `grid-cols-1 md:grid-cols-2 gap-6`
- Container: `max-w-4xl mx-auto p-6`
- Page title centered above grid

**Role Cards:**
- Large clickable cards: `p-8 rounded-xl border-2 hover:border-blue-500`
- Background: white with subtle shadow
- Icon: 48px size, blue color
- Role name: text-xl font-semibold
- Description: text-sm text-gray-600
- Hover state: border-blue-500 shadow-lg transform scale-105

### Navigation & Headers

**Mobile Header:**
- Fixed top bar: `h-14 bg-white border-b border-gray-200`
- Three sections: Menu icon | Title | Notifications
- Shadow: `shadow-sm`
- Text: gray-900
- Icons: 24px, gray-600

**Vertical Sidebar Navigation (Admin/Manager Dashboards):**
- **Layout:**
  - Fixed left sidebar: `w-64` (256px) on desktop, collapsible on mobile
  - Background: `bg-card` with subtle border-right
  - Full height: `min-h-screen`
  - Padding: `p-4` for spacing
- **Navigation Buttons:**
  - Button style: `w-full justify-start text-left px-4 py-2.5 rounded-lg`
  - Font: `text-sm font-medium`
  - Height: `min-h-11` (44px minimum for touch)
  - Icon + text layout: icon 20px, mr-3 gap
  - Inactive: `text-muted-foreground hover-elevate`
  - Active: `bg-primary text-primary-foreground` (filled blue)
  - Spacing: `space-y-1` between buttons
- **Configuration Section:**
  - Collapsible group containing all master data
  - Header button: Uses ChevronDown icon that rotates when expanded
  - Indented children: `pl-7` for nested items
  - Master data includes: Users, Role Permissions, Machines, Machine Types, Checklists, Spare Parts, PM Templates, Unit of Measurement, Products, Raw Materials, Finished Goods, Vendors
- **Section Groups:**
  - Optional labels: `text-xs font-semibold text-muted-foreground uppercase mb-2 px-2`
  - Dividers: `border-t border-border my-4` between logical groups
- **Mobile Behavior:**
  - Sidebar hidden by default, opens as drawer/overlay
  - Hamburger icon in header toggles sidebar
  - Full-width overlay with backdrop when open

### Dashboard Cards

**Stat Cards:**
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Card style: `bg-white rounded-lg border border-gray-200 p-6`
- Icon: 40px, colored background circle
- Value: text-3xl font-bold text-gray-900
- Label: text-sm text-gray-600
- Shadow: `shadow-sm hover:shadow-md` transition

**Content Cards:**
- Background: white
- Border: `border border-gray-200 rounded-lg`
- Padding: `p-6`
- Shadow: `shadow-sm`
- Spacing between elements: space-y-4

### Forms & Inputs

**Input Fields:**
- Height: `h-10` (40px)
- Border: `border border-gray-300 rounded-md`
- Focus: `ring-2 ring-blue-500 border-blue-500`
- Padding: `px-3 py-2`
- Background: white
- Text: text-sm text-gray-900

**Labels:**
- Font: text-sm font-medium text-gray-700
- Margin: mb-2

**Buttons:**
- **Primary:** `bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium`
- **Secondary:** `bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-lg`
- **Success:** `bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg`
- **Danger:** `bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg`
- **Icon Button:** `h-9 w-9 rounded-md hover:bg-gray-100`

**Toggles/Radio Buttons:**
- Large touch targets: minimum 44px height
- Pass/Fail clearly labeled
- Pass: green accent when selected
- Fail: red accent when selected

**Dropdowns/Select Components (Modern Button Style):**
- **Trigger Button:**
  - Height: `min-h-11` (44px minimum for mobile touch)
  - Border: `border border-input rounded-lg`
  - Padding: `px-4 py-2.5`
  - Font: `text-sm font-medium`
  - Shadow: `shadow-sm` with hover elevation
  - Icon: ChevronDown 20px, rotates 180° when open
  - Interactive: Uses `hover-elevate` and `active-elevate-2` for modern feel
  - Transition: Smooth animations on all interactions
- **Dropdown Content:**
  - Max height: `max-h-96` (384px) with scroll
  - Min width: `min-w-[12rem]` (192px)
  - Border: `rounded-lg shadow-lg`
  - Padding: `p-1.5`
  - Animation: Smooth fade and zoom in/out
- **Dropdown Items:**
  - Height: `py-2.5` (40px+) for easy touch
  - Font: `text-sm font-medium`
  - Padding: `pl-9 pr-3` (space for check icon)
  - Border radius: `rounded-md`
  - Hover: Uses `hover-elevate` for subtle elevation
  - Selected: Check icon (16px) on left, bold
  - Interactive: `cursor-pointer` with smooth transitions
- **Mobile/iPad Optimization:**
  - Large touch targets throughout
  - Button-like appearance familiar to mobile users
  - Smooth animations matching native app feel
  - Adequate spacing between items for fat-finger taps

### Tables & Lists

**Data Tables:**
- Header: `bg-gray-50 border-b border-gray-200 font-semibold text-xs uppercase text-gray-700`
- Rows: `border-b border-gray-200 hover:bg-gray-50`
- Cell padding: `px-6 py-4`
- Text: text-sm text-gray-900
- Alternating rows optional: even:bg-gray-50

**Status Badges:**
- Pill shape: `rounded-full px-3 py-1 text-xs font-medium`
- Upcoming: `bg-green-100 text-green-800`
- Overdue: `bg-red-100 text-red-800`
- Completed: `bg-gray-100 text-gray-800`
- In Review: `bg-blue-100 text-blue-800`
- Approved: `bg-green-100 text-green-800`
- Rejected: `bg-red-100 text-red-800`

**Overdue Checklist Indicators:**
- **Visual Styling:**
  - Card background: `bg-red-50` for overdue pending checklists
  - Border: `border-red-500` for clear visual distinction
  - Text colors: `text-red-900` for titles, `text-red-700` for secondary text, `text-red-600` for labels
  - Icon: AlertCircle from lucide-react (16px) in red-600
- **Overdue Logic:**
  - A checklist is overdue when: status is 'pending' AND assignedDate is before today (start of day)
  - Utility function: `isOverdue(assignedDate, status)` uses date-fns for reliable date comparison
- **Operator View:**
  - Separate sections: "Today's Assignments" and "Overdue Assignments" for clarity
  - Overdue checklists shown prominently at top with red styling and AlertTriangle icon
  - Overdue count displayed in section header
- **Manager View:**
  - Overdue assignments displayed in-line with all assignments
  - Red card styling with AlertCircle icon next to checklist name
  - Overdue count displayed below "Checklist Assignments" header
  - Status badge shows "OVERDUE" in red (bg-red-100, text-red-800, border-red-300)
- **Consistency:**
  - All overdue indicators use consistent red color palette (red-50 to red-900)
  - Icons are always 16px (w-4 h-4) for visual consistency
  - Badge styling uses same red-100/red-800 combination across all views

### Dialogs & Modals

**Modal Container:**
- Overlay: `bg-black bg-opacity-50`
- Content: `bg-white rounded-lg shadow-xl max-w-2xl`
- Padding: `p-6`
- Border: none (shadow provides elevation)

**Modal Header:**
- Title: text-xl font-semibold text-gray-900
- Close button: top-right, icon-only, hover:bg-gray-100

**Modal Body:**
- Padding: `py-4`
- Max height with scroll if needed
- Form elements spaced with space-y-4

**Modal Footer:**
- Border top: `border-t border-gray-200 pt-4`
- Buttons: right-aligned, gap-3
- Cancel (secondary) + Action (primary)

### Checklist Forms (Operator)

**Mobile-Optimized:**
- Full-width cards for each task
- Task card: `bg-white border border-gray-200 rounded-lg p-4 space-y-3`
- Task number: Small badge with gray background
- Task name: text-base font-medium
- Verification criteria: text-sm text-gray-600
- Pass/Fail: Large radio buttons, horizontally arranged
- Photo upload: Full-width button with camera icon
- Notes: Textarea with placeholder

### PM Execution Dialog

**Layout:**
- Scrollable task list in modal
- Each task as accordion or card
- Progress indicator at top: "3 of 5 tasks complete"
- Task cards show:
  - Task name with photo badge if required
  - Description and verification criteria
  - Pass/Fail radio group
  - Photo upload input
  - Notes textarea
- General notes at bottom
- Disabled submit until all tasks complete

### PM History View

**Grid Layout:**
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Cards show execution summary
- Click card opens detail modal

**Execution Card:**
- Machine name: font-semibold text-lg
- Date: text-sm text-gray-600
- Executor: text-sm
- Pass/Fail badges: colored pills showing summary
- "View Details" link or button

**Detail Modal:**
- Shows all task results
- Each task with pass/fail icon
- Photos displayed inline
- Notes shown for each task
- Timestamp and executor info

## Responsive Behavior

### Mobile (<768px)
- Single column layouts
- Full-width cards and forms
- Bottom padding for fixed navigation
- Touch-optimized button sizes (min 44px height)
- Stack all grid layouts to single column
- Role cards: 1 column
- Stat cards: 1 column

### Tablet (768px-1024px)
- 2-column grids for role selector, stats
- Maintain readable line lengths
- Sidebar collapsible

### Desktop (>1024px)
- Multi-column layouts (up to 4 columns for stats)
- Role selector: 2x2 grid
- Larger modal widths (max-w-3xl or max-w-4xl)
- Hover states enabled
- Tables show all columns

## Visual Polish

### Shadows
- Cards: `shadow-sm` (subtle)
- Hover cards: `shadow-md` (medium)
- Modals: `shadow-xl` (prominent)
- Dropdowns: `shadow-lg`

### Transitions
- All hover states: `transition-all duration-200`
- Button hovers: smooth color transitions
- Card hovers: smooth shadow and border transitions

### Borders & Rounding
- Cards: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Inputs: `rounded-md` (6px)
- Badges: `rounded-full`
- Modals: `rounded-lg`

### Spacing Consistency
- Section gaps: space-y-8 or space-y-6
- Card internal spacing: space-y-4
- Form element gaps: space-y-3
- Inline element gaps: gap-2 or gap-3

## Icons
- Use Lucide React icons throughout
- Size: 20px for buttons, 24px for headers, 16px for inline
- Color: Match surrounding text or use theme colors
- Always include accessible labels

## Accessibility
- Minimum touch target: 44px x 44px
- Color contrast ratio: 4.5:1 minimum
- Focus indicators: ring-2 ring-blue-500
- Keyboard navigation support
- ARIA labels on icon-only buttons
- Semantic HTML structure

## Special Considerations

### Manufacturing Environment
- High contrast text for visibility
- Large touch targets
- Clear visual feedback
- Confirmation dialogs for destructive actions
- Auto-save functionality
- Offline support indicators

### Mobile PWA
- App-like experience (no browser chrome feel)
- Fixed headers and navigation
- Smooth scrolling
- Pull-to-refresh on lists
- Loading states for all async operations
- Network status indicators
