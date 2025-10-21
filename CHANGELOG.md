# Changelog

All notable changes to this project will be documented in this file.

## V1.0 — 2025-10-21

Highlights:
- Sidebar improvements: Directory and Upload moved under Modules; new Help button opens Version History modal.
- Version History modal: reads from System Information API to show official release history.
- Statistics restyle: simplified white-on-dark counters in the top bar.
- Tooltips: added across action buttons (simple and full views; directories and broadcasts).
- Navigation cleanup: removed Vinculaciones quick link and renamed admin tab to “Connections”.
- New and updated components: VersionHistoryModal, SystemInfoManager, RepoContentPage, and various manager modals.
- Backend support for System Information releases (migrations and endpoints).

Changes:
- frontend/src/components/ComercialesManager.jsx: sidebar button placement, Help button, stats styling, tooltips, and modal wiring.
- frontend/src/components/VersionHistoryModal.jsx: new modal fetching from /api/system-info/.
- frontend/src/components/SystemInfoManager.jsx: admin UI to manage releases.
- Multiple UI fixes across Navbar, Login, Repositorios, Usuarios, etc.
- Added icons and assets for UI actions.
- Backend: serializers/views/migrations to support system info and related features.

Tag: V1.0
Commit: see tag details on GitHub.
