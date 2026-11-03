# 📏 Coding Standards & Engineering Conventions: WorkTrack

> **Target Standard:** PEP 8 (Python) | Airbnb / React Recommended (JavaScript) | RESTful API Conventions

---

## 1. Python & Django Conventions

1. **PEP 8 Compliance:** 
   * Line length: maximum 100 characters.
   * Indentation: strictly 4 spaces (no tabs).
   * Imports ordered: Standard library $\rightarrow$ Third-party packages (Django, DRF) $\rightarrow$ Local application modules.
2. **Explicit Models:**
   * Every model must define `__str__` returning a human-readable identifier.
   * Explicit `verbose_name` and `verbose_name_plural` on all `Meta` classes.
   * Model fields must define `db_index=True` on frequently filtered or joined attributes (`created_at`, `status`, `shift_date`).
   * Explicit `related_name` on all `ForeignKey` and `ManyToManyField` definitions.
3. **DRF Serializers & ViewSets:**
   * Prefer `ModelSerializer` over manually mapping fields.
   * Explicitly define `read_only_fields` on auto-generated or calculated attributes (`id`, `created_at`, `version`, `duration_hours`).
   * Avoid N+1 queries by using `select_related()` for foreign keys and `prefetch_related()` for many-to-many/reverse relations in `get_queryset()`.

---

## 2. React & Frontend Conventions

1. **Component Design:**
   * Functional components using React 19 Hooks (`useState`, `useEffect`, `useContext`, `useMemo`).
   * One component per file; file name matches the component name in PascalCase (e.g. `HourlySurveillance.jsx`).
2. **State Mutability:**
   * Never mutate state directly; always use state updater functions or functional updates (`setItems(prev => [...prev, newItem])`).
3. **Tailwind CSS Organization:**
   * Utility classes ordered logically: Layout/Display (`flex`, `grid`) $\rightarrow$ Sizing (`w-full`, `h-10`) $\rightarrow$ Spacing (`p-4`, `m-2`) $\rightarrow$ Typography (`text-sm`, `font-bold`) $\rightarrow$ Colors/Surfaces (`bg-slate-900`, `text-white`) $\rightarrow$ Borders/Shadows $\rightarrow$ Interactions (`hover:`, `focus:`).
4. **Resilient Data Access:**
   * Always use optional chaining (`object?.property`) and fallback defaults (`items || []`) when rendering nested arrays or properties to prevent white-screen crashes.

---

## 3. Git Workflow & Commit Conventions

Commits follow the Conventional Commits specification:

```text
<type>(<scope>): <short descriptive imperative summary>

[optional body explaining why and what changed]

[optional footer referencing issues or tasks]
```

### Types:
* `feat`: A new feature or endpoint.
* `fix`: A bug fix or patch.
* `docs`: Documentation additions or revisions.
* `style`: Formatting or whitespace changes (no code behavior change).
* `refactor`: Code changes that neither fix a bug nor add a feature.
* `test`: Adding or correcting automated test cases.
* `chore`: Build process, dependency updates, or configuration tasks.

### Examples:
* `feat(attendance): implement check-in duplicate prevention and duration calculation`
* `fix(reports): ensure report version snapshots capture full json snapshot`
* `docs(api): update openapi mapping for surveillance endpoints`

