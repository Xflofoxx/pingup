# Dashboard Specification

> **Version**: 1.0.0  
> **Component**: Dashboard  
> **Related Requirements**: DASH-01 through DASH-10  
> **Status**: Proposed

## 1. Overview

The Pingup Dashboard provides a modern, responsive web interface for monitoring agents, viewing metrics, managing alerts, and administering the system. Built with TailwindCSS for styling and vanilla JavaScript for minimal dependencies.

## 2. Technical Stack

| Component | Technology | Version | Justification |
|-----------|------------|---------|----------------|
| Styling | TailwindCSS | 3.0+ | Utility-first CSS framework |
| Icons | Font Awesome | 6.0+ | Comprehensive icon library |
| Fonts | Google Fonts (Inter) | - | Modern, readable typeface |
| HTTP Client | Native Fetch API | - | No additional dependencies |
| State | LocalStorage | - | Persist user preferences |

## 3. Pages & Routes

### 3.1 Public Pages

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | Landing page with public statistics |
| `/login` | Public | Login page with TOTP/password |
| `/register` | Public | User registration |
| `/forgot-password` | Public | Password recovery |

### 3.2 Protected Pages

| Route | Role | Description |
|-------|------|-------------|
| `/dashboard` | All | Main dashboard with overview |
| `/dashboard/agents` | IT+ | Agent management |
| `/dashboard/agents/:id` | IT+ | Agent details |
| `/dashboard/metrics` | IT+ | Metrics visualization |
| `/dashboard/alerts` | IT+ | Alert management |
| `/dashboard/groups` | IT+ | Agent groups |
| `/dashboard/reports` | IT+ | Scheduled reports |
| `/dashboard/security` | SUP+ | Security overview |
| `/dashboard/certificates` | SUP+ | SSL certificates |
| `/dashboard/processes` | SUP+ | Process monitoring |
| `/dashboard/services` | SUP+ | Service monitoring |
| `/dashboard/bandwidth` | SUP+ | Bandwidth metrics |
| `/dashboard/settings` | IT+ | User settings |
| `/dashboard/users` | ADM | User management |
| `/dashboard/audit` | ADM | Audit logs |

## 4. UI/UX Requirements

### 4.1 Responsive Design (DASH-01)

The dashboard must work on all device sizes:

- **Mobile** (< 640px): Single column, hamburger menu
- **Tablet** (640px - 1024px): Two columns, collapsible sidebar
- **Desktop** (> 1024px): Full layout with persistent sidebar

### 4.2 Theme Support (DASH-02)

| Theme | Description |
|-------|-------------|
| Light | Default light theme |
| Dark | Dark mode for low-light environments |
| System | Follows OS preference |

Theme toggle in header with persistence via localStorage.

### 4.3 Color Palette

**Primary Colors:**
- Blue: #3b82f6 (primary actions)
- Purple: #8b5cf6 (secondary)
- Green: #22c55e (success)
- Red: #ef4444 (error)
- Yellow: #eab308 (warning)

**Light Theme:**
- Background: #ffffff
- Surface: #f3f4f6
- Text Primary: #111827
- Text Secondary: #6b7280

**Dark Theme:**
- Background: #111827
- Surface: #1f2937
- Text Primary: #f9fafb
- Text Secondary: #9ca3af

## 5. Components

### 5.1 Navigation

- **Sidebar**: Persistent on desktop, drawer on mobile
- **Header**: Logo, search, notifications, theme toggle, user menu
- **Breadcrumbs**: Path indication for nested pages

### 5.2 Data Display

- **Cards**: Metric summaries with sparklines
- **Tables**: Sortable, filterable data tables
- **Charts**: Line charts for time-series, bar charts for comparisons
- **Status Badges**: Online/offline/enabled/disabled states

### 5.3 Forms

- **Input Fields**: Consistent styling, validation feedback
- **Buttons**: Primary, secondary, danger variants
- **Modals**: Confirmation dialogs, form dialogs

### 5.4 Notifications (DASH-03)

- **Toast Messages**: Success/error/warning/info
- **Notification Center**: Dropdown with recent alerts
- **Bell Icon**: Badge for unread count

## 6. Features

### 6.1 Real-time Updates (DASH-09)

- Auto-refresh metrics every 30 seconds
- WebSocket support for instant alerts (future)
- Visual indicator for connection status

### 6.2 Keyboard Shortcuts (DASH-05)

| Shortcut | Action |
|----------|--------|
| `?` | Show help |
| `/` | Focus search |
| `g d` | Go to dashboard |
| `g a` | Go to agents |
| `e` | Refresh data |

### 6.3 Offline Support (DASH-04)

- Cache last known data in localStorage
- Show "offline" indicator when disconnected
- Queue actions for when back online

### 6.4 Custom Widgets (DASH-06)

- Drag-and-drop dashboard customization
- Resizable widget containers
- Add/remove widgets dynamically

### 6.5 Internationalization (DASH-07)

Supported languages:
- English (en) - Default
- Italian (it)
- Spanish (es)

### 6.6 PWA Support (DASH-10)

- Service worker for offline caching
- Web app manifest for installability
- Push notification support

### 6.7 Accessibility (DASH-08)

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators

## 7. API Integration

### 7.1 Authentication

```javascript
// Login
POST /api/v1/auth/login-password
{ "username": "user", "password": "pass" }

// Response
{ "token": "jwt-token", "user": { "id": "...", "username": "..." } }
```

### 7.2 Data Fetching

```javascript
// Fetch agents
GET /api/v1/agents
Authorization: Bearer <token>

// Fetch metrics
GET /api/v1/metrics/:agentId?from=...&to=...
```

### 7.3 Error Handling

- Show toast on API errors
- Retry failed requests automatically
- Display offline message when disconnected

## 8. Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 2s |
| Time to interactive | < 3s |
| API response display | < 500ms |
| Theme switch | < 100ms |

## 9. Development Commands

```bash
# Run server (dashboard served from server)
cd server && bun run dev

# Access dashboard
http://localhost:3000
```

## 10. Implementation Checklist

### Pre-Implementation Gates

- [x] Simplicity Gate: Single-page application?
- [x] Anti-Abstraction Gate: Using vanilla JS?
- [x] Integration-First Gate: API contracts defined?

### Requirement Traceability

- [ ] DASH-01: Responsive Design → Tailwind breakpoints
- [ ] DASH-02: Dark/Light Theme → CSS variables + toggle
- [ ] DASH-03: Dashboard Notifications → Notification component
- [ ] DASH-04: Offline Support → Service worker
- [ ] DASH-05: Keyboard Shortcuts → Event listeners
- [ ] DASH-06: Custom Widgets → Drag-drop library
- [ ] DASH-07: Internationalization → i18n strings
- [ ] DASH-08: Accessibility → ARIA labels
- [ ] DASH-09: Real-time Updates → Polling/WebSocket
- [ ] DASH-10: PWA Support → Manifest + service worker

## 11. Cross-References

| Reference | File | Description |
|-----------|------|-------------|
| CONTEXT.md | spec/CONTEXT.md | Development constitution |
| SERVER.md | spec/SERVER.md | Server specification |
| AGENT.md | spec/AGENT.md | Agent specification |
| DASH-01 | spec/server/DASH-01-responsive-design.md | Responsive requirement |
| DASH-02 | spec/server/DASH-02-dark-light-theme.md | Theme requirement |
| DASH-03 | spec/server/DASH-03-dashboard-notifications.md | Notifications requirement |
| DASH-04 | spec/server/DASH-04-offline-support.md | Offline requirement |
| DASH-05 | spec/server/DASH-05-keyboard-shortcuts.md | Shortcuts requirement |
| DASH-06 | spec/server/DASH-06-custom-widgets.md | Widgets requirement |
| DASH-07 | spec/server/DASH-07-internationalization.md | i18n requirement |
| DASH-08 | spec/server/DASH-08-accessibility.md | Accessibility requirement |
| DASH-09 | spec/server/DASH-09-real-time-updates.md | Real-time requirement |
| DASH-10 | spec/server/DASH-10-pwa-support.md | PWA requirement |
