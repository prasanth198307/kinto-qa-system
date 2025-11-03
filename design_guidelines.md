# Design Guidelines for KINTO QA Management System

## Design Approach

**System Foundation:** Material Design principles adapted for industrial QA workflows, drawing from productivity tools like Linear and Notion, with mobile-first execution inspired by the provided mockups.

**Design Philosophy:** Professional, data-dense interface optimized for quick data entry and verification workflows. Prioritize clarity, speed, and error prevention in a manufacturing environment where operators may have limited time and potentially gloved hands.

## Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts CDN) - exceptional readability at small sizes
- Headings: 600-700 weight
- Body: 400-500 weight
- Data/Tables: 500 weight for consistency
- Captions/Labels: 400 weight

**Hierarchy:**
- Page Titles: text-2xl (24px) font-semibold
- Section Headers: text-lg (18px) font-semibold
- Card Titles: text-base (16px) font-medium
- Body Text: text-sm (14px) font-normal
- Table Data: text-sm (14px) font-medium
- Labels/Captions: text-xs (12px) font-normal
- Buttons: text-sm (14px) font-medium

## Layout System

**Spacing Units:** Maintain consistency using Tailwind units of 2, 4, 6, 8, 12, and 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card margins: m-4
- Input fields: p-3
- Buttons: px-6 py-3

**Container Strategy:**
- Mobile: Full width with px-4 side padding
- Desktop: max-w-7xl centered for admin dashboards
- Forms: max-w-2xl for optimal data entry
- Tables: Full width with horizontal scroll on mobile

## Component Library

### Navigation & Headers

**Mobile Header (All Roles):**
- Fixed top bar with h-14 height
- Left: Hamburger menu icon (24px)
- Center: "KINTO QA" logo/text
- Right: Notification bell icon (24px) with badge counter
- Background: Teal/cyan gradient (matching mockup)
- Text and icons in white for contrast

**Sidebar Navigation (Desktop):**
- w-64 fixed sidebar with bg-white
- Role-based menu items with icons (Heroicons)
- Active state: teal background with rounded corners
- Hover state: light gray background
- Collapsible on tablet/mobile into hamburger drawer

**Dashboard Cards:**
- Rounded-lg shadow-sm border
- p-6 internal padding
- Stat cards: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Metric display: Large number (text-3xl font-bold) above label (text-sm text-gray-600)
- Action buttons at card bottom

### Forms & Data Entry

**Checklist Forms:**
- Section-based layout with clear dividers
- Header metadata: Date picker, shift selector (radio buttons), supervisor name input
- Task rows: Table format on desktop, stacked cards on mobile
- Each task row contains:
  - Task name (font-medium)
  - Verification criteria (text-sm text-gray-600)
  - Pass/Fail toggle (large touch targets - h-10 w-20)
  - Remarks textarea (expanding)
  - Signature capture area (if required)

**Spare Parts Entry (Dynamic):**
- "+ Add Spare Part" button (outline style)
- Each spare part row:
  - Item name dropdown (searchable)
  - Quantity number input (w-20)
  - Urgency selector: Color-coded badges (Low: gray, Medium: yellow, High: orange, Critical: red)
  - Remove icon button

**Input Fields:**
- Consistent height: h-12
- Border: border-gray-300 rounded-lg
- Focus state: ring-2 ring-teal-500
- Label above input: text-sm font-medium mb-2
- Helper text below: text-xs text-gray-500
- Error state: border-red-500 with red text message

### Tables & Lists

**Data Tables:**
- Alternating row backgrounds (even rows: bg-gray-50)
- Header: bg-gray-100 font-semibold sticky top-0
- Cell padding: px-4 py-3
- Mobile: Cards with key-value pairs instead of table
- Action column: Right-aligned icon buttons (View, Edit, Delete)
- Sortable columns: Arrow icons in headers
- Filtering: Dropdown selectors above table

**Status Badges:**
- Pill shape: rounded-full px-3 py-1
- Pending: bg-yellow-100 text-yellow-800
- In Review: bg-blue-100 text-blue-800
- Approved: bg-green-100 text-green-800
- Rejected: bg-red-100 text-red-800
- Completed: bg-gray-100 text-gray-800

### Buttons & Actions

**Primary Buttons:**
- Teal background matching brand
- White text, font-medium
- px-6 py-3 rounded-lg
- Hover: Darker teal
- Disabled: Opacity-50 cursor-not-allowed

**Secondary Buttons:**
- White background, teal border
- Teal text
- Same sizing as primary

**Icon Buttons:**
- Square: h-10 w-10
- Rounded-lg
- Hover: bg-gray-100
- Icons: 20px size

**Floating Action Button (Mobile):**
- Fixed bottom-right: bottom-6 right-6
- Large circular: h-14 w-14 rounded-full
- Teal background, white "+" icon
- shadow-lg for elevation

### Alerts & Notifications

**Alert Cards (Matching Mockup):**
- Red accent for missed/critical items
- Yellow accent for warnings
- Card structure: p-4 border-l-4
- Icon (24px) + Message + Timestamp
- Dismissible with X button

**Toast Notifications:**
- Fixed top-right position
- Slide-in animation
- Auto-dismiss after 5 seconds
- Success: Green, Error: Red, Info: Blue, Warning: Yellow

### Signature Capture

**Digital Signature Component:**
- Canvas area: h-32 border-2 border-dashed rounded-lg
- "Sign Here" placeholder text centered
- Clear button (text-sm text-gray-600) top-right
- Save as base64 image
- Display saved signature as img with h-16

### Admin Configuration Screens

**Builder Interface (Checklist/Machine Config):**
- Split layout: Toolbar (left) + Preview (right) on desktop
- Drag-and-drop task ordering (visual indicators)
- Form fields for configuration in left panel
- Live preview in right panel
- Save/Cancel buttons fixed at bottom

**User Management Table:**
- Search bar top-right
- Columns: Name, Email, Role, Assigned Machines, Status, Actions
- Role selector: Dropdown with icons
- Assignment modal: Multi-select checklist

## Responsive Behavior

**Mobile (<768px):**
- Single column layouts
- Hamburger navigation
- Full-width cards
- Stacked form fields
- Bottom tab navigation for primary sections
- Tables convert to cards with key-value pairs

**Tablet (768px-1024px):**
- Two-column grids where appropriate
- Persistent sidebar (collapsible)
- Optimized touch targets (min 44px height)

**Desktop (>1024px):**
- Multi-column dashboards
- Side-by-side forms and previews
- Data tables with full columns
- Hover states enabled

## Images & Media

**No hero images** - This is a utility application focused on data entry and management.

**Machine Icons/Images:**
- Small thumbnail images (h-12 w-12 rounded) next to machine names in lists
- Larger images (h-48) in machine detail views
- Placeholder icons for machines without images (use Heroicons cog icon)

**User Avatars:**
- Circular: h-10 w-10 rounded-full
- Initials fallback for users without photos
- Use in headers and assignment displays

## Special Considerations

**PWA Requirements:**
- App-like header (no browser chrome appearance)
- Bottom navigation on mobile (fixed position)
- Offline indicators when disconnected
- Loading states for all async operations
- Pull-to-refresh on mobile lists

**Manufacturing Environment:**
- High contrast for visibility in various lighting
- Large touch targets (minimum 44px)
- Confirmation dialogs for destructive actions
- Auto-save drafts to prevent data loss
- Clear visual feedback for all interactions