# SERV-013: Dashboard Pages

> **Requirement**: SERV-013  
> **Component**: Server (Dashboard)  
> **Status**: Draft

## User Need

As a user, I need a web-based dashboard to monitor network health, manage agents, and administer the system based on my role.

## Why This Requirement Exists

- Provide visual representation of network metrics
- Enable easy agent management
- Support security monitoring workflows
- Enable user administration

## Pages

### 1. Login Page (`/login`)

**Access**: Public

- Username input
- TOTP code input (6 digits)
- "Remember me" checkbox
- Link to register new account

### 2. Register Page (`/register`)

**Access**: Public

- Username selection
- TOTP QR code display
- Manual secret key display (for apps without QR)
- Confirmation code input
- Terms acceptance

### 3. Public Dashboard (`/` or `/dashboard/public`)

**Access**: Public (no login required)

| Section | Content |
|---------|---------|
| Network Health | Aggregate health score (0-100) |
| Online Agents | Count of online agents |
| Average CPU | Network-wide average CPU % |
| Average RAM | Network-wide average RAM % |
| Recent Alerts | Last 5 critical alerts |
| Network Map | Simple topology visualization |

**Data**: All data is anonymized/aggregated, no sensitive details

### 4. IT Dashboard (`/dashboard/it`)

**Access**: IT, SUP, ADM

| Section | Content |
|---------|---------|
| Agent Status | Table of all agents with status |
| Agent Details | Click to view agent metrics history |
| Commands | Send commands to agents |
| Metrics Charts | CPU, RAM, Disk over time |
| Network Discovery | Recent scan results |
| System Logs | Recent log entries |

### 5. Security Dashboard (`/dashboard/security`)

**Access**: SUP, ADM

| Section | Content |
|---------|---------|
| Security Score | Overall security posture (0-100) |
| Threat Detection | Recent security events |
| Network Anomalies | Unusual network activity |
| Port Status | Summary of open ports |
| Authentication Events | Login attempts, failures |
| Compliance Status | Basic compliance checks |

### 6. Admin Panel (`/admin`)

**Access**: ADM only

| Section | Content |
|---------|---------|
| User Management | CRUD for users |
| Role Assignment | Assign roles to users |
| System Configuration | Server settings |
| Audit Logs | All system actions |
| API Keys | Manage API keys |
| Database Status | Storage usage, health |

## UI/UX Requirements

- Responsive design (mobile, tablet, desktop)
- Dark/light theme toggle
- Real-time data updates (WebSocket or polling)
- Loading states and error handling
- Accessible (WCAG 2.1 AA)

## Implementation

- Single Page Application served by Hono
- Client-side routing
- REST API for data
- HTMX or vanilla JS for interactivity

## Dependencies

- SERV-011: Dashboard Authentication
- SERV-012: Dashboard RBAC

## Success Metrics

- Page load time: <2 seconds
- Data refresh: <1 second
- Mobile usability: 100%
