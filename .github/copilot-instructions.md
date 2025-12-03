
# Copilot Instructions for AI Agents

## Project Overview
This is a React TypeScript application for managing an academy (courses, teachers, rooms, members, types). The codebase is modular, maintainable, and uses strict typing throughout.

## Architecture & Major Components
- **src/pages/**: Main feature pages (e.g., `GestioneCorsi.tsx`, `CalcoloPreventivo.tsx`). Each page is a workflow entry point.
- **src/components/**: Shared UI (e.g., `DataTable`, `Navbar`, dialogs, `ProtectedRoute`).
- **src/contexts/AuthContext.tsx**: Centralized authentication and user state.
- **src/hooks/**: Custom hooks for form validation (`useFormValidation`), data access (`useSupabaseData`), time slots, and dialog state (`useDialog` if present).
- **src/config/supabase.ts**: Supabase backend integration.
- **src/types/index.ts**: Domain and API types. Update here for new models.
- **src/utils/**: Formatting and helper functions (e.g., `formatPrice`, `formatDate`).
- **src/constants/index.ts**: Error/success messages, validation patterns, time slot config.

## Data Flow & Integration
- **Supabase**: All backend data and authentication. Use `useSupabaseData` for CRUD and reload logic. Credentials in `src/config/supabase.ts`.
- **Context API**: Global state for auth/user info (`AuthContext`).
- **Pages**: Compose hooks and components for feature logic and UI.

## Developer Workflows
- **Build**: `npm run build` (production)
- **Start**: `npm start` (local dev)
- **Testing**: No explicit test scripts; add tests in `src/__tests__` if needed.
- **Debugging**: Use browser devtools, React DevTools, and Supabase logs for backend issues.

## Project-Specific Conventions & Patterns
- **TypeScript everywhere**: All logic/components strictly typed. Update `src/types/index.ts` for new models.
- **Functional components & hooks**: No class components. Use hooks for state, effects, and validation.
- **Dialogs**: Use `ErrorDialog` for errors, `WarningDialog` for warnings/confirmations. Prefer `useDialog` for dialog state (see REFACTORING.md for API).
- **Reusable UI**: Use `DataTable` for tabular data with sorting/filtering/actions. See `src/components/DataTable.tsx` for usage.
- **Protected routes**: Use `ProtectedRoute` to restrict access by role (see `src/contexts/AuthContext.tsx`).
- **Constants**: Store shared config/messages in `src/constants/index.ts`.
- **Utilities**: Use helpers in `src/utils/formatters.ts` for formatting prices, dates, names.

## Integration Points & External Dependencies
- **Supabase**: All backend data/auth. See `src/config/supabase.ts` and `useSupabaseData`.
- **React Router**: Navigation between pages.
- **Material UI**: All UI components.

## Examples & Usage Patterns
- **Fetch data**: `const { data, create, update, remove } = useSupabaseData<T>('TableName')`
- **Form validation**: `const { errors, validate } = useFormValidation()`
- **Dialog state**: `const dialog = useDialog<MyType>()` (see REFACTORING.md)
- **Show error**: `<ErrorDialog open={...} title="Errore" message={...} onClose={...} />`
- **Protect route**: `<ProtectedRoute allowedRoles={[...]}>{...}</ProtectedRoute>`
- **Table UI**: `<DataTable title="..." columns={...} data={...} onEdit={...} />`

## Key Files
- `src/pages/CalcoloPreventivo.tsx`: Feature page example
- `src/components/DataTable.tsx`: Reusable table
- `src/contexts/AuthContext.tsx`: Auth logic
- `src/hooks/useSupabaseData.ts`: Data access pattern
- `src/config/supabase.ts`: Backend config
- `src/constants/index.ts`: Shared constants
- `REFACTORING.md`: Details on reusable hooks/components and migration patterns

---

**Feedback:** If any section is unclear or missing important project-specific details, please specify so it can be improved.