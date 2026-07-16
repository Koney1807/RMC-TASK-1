import { FormEvent, useEffect, useRef, useState } from "react";
import {
  deleteRegistration,
  downloadCsv,
  fetchRegistrations,
  Registration,
  RegistrationPayload,
  updateRegistration,
} from "../api/client";
import { EVENTS } from "../constants";

interface Props {
  username: string;
  onLogout: () => void;
}

const PAGE_SIZE = 25;

type EditErrors = Partial<Record<keyof RegistrationPayload, string>>;

function validateEdit(values: RegistrationPayload): EditErrors {
  const errors: EditErrors = {};
  if (!values.fullName.trim()) errors.fullName = "Required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Invalid email";
  if (!/^[+()\-\s\d]{7,20}$/.test(values.phone.trim())) errors.phone = "Invalid phone";
  if (!values.department.trim()) errors.department = "Required";
  if (!values.eventName) errors.eventName = "Required";
  return errors;
}

export default function AdminDashboard({ username, onLogout }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<RegistrationPayload | null>(null);
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tracks the most recently issued request so a slow, older response can't
  // clobber the result of a newer search/page fired before it returned.
  const requestId = useRef(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load(filter: string, pageToLoad: number) {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRegistrations(filter, pageToLoad, PAGE_SIZE);
      if (thisRequest !== requestId.current) return; // a newer request has since started
      setRegistrations(result.items);
      setTotal(result.total);
    } catch (err) {
      if (thisRequest !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to load registrations.");
    } finally {
      if (thisRequest === requestId.current) setLoading(false);
    }
  }

  async function handleExport() {
    try {
      await downloadCsv(activeFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export registrations.");
    }
  }

  useEffect(() => {
    load(activeFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeFilter]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setActiveFilter(search);
  }

  function handleClear() {
    setSearch("");
    setActiveFilter("");
    setPage(0);
  }

  function startEdit(r: Registration) {
    setEditingId(r.id);
    setEditValues({
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      department: r.department,
      eventName: r.eventName,
    });
    setEditErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(null);
    setEditErrors({});
  }

  async function saveEdit(id: string) {
    if (!editValues) return;
    const validationErrors = validateEdit(editValues);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setEditSaving(true);
    try {
      await updateRegistration(id, {
        ...editValues,
        fullName: editValues.fullName.trim(),
        email: editValues.email.trim(),
        phone: editValues.phone.trim(),
        department: editValues.department.trim(),
      });
      setStatusMessage("Registration updated.");
      cancelEdit();
      load(activeFilter, page);
    } catch (err) {
      setEditErrors({ fullName: err instanceof Error ? err.message : "Could not save changes." });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(r: Registration) {
    if (!window.confirm(`Delete ${r.fullName}'s registration for "${r.eventName}"? This can't be undone.`)) {
      return;
    }
    setDeletingId(r.id);
    setError(null);
    try {
      await deleteRegistration(r.id);
      setStatusMessage(`Deleted ${r.fullName}'s registration.`);
      // If we just deleted the last row on a page beyond the first, step
      // back a page instead of showing an empty page.
      const isLastRowOnPage = registrations.length === 1 && page > 0;
      if (isLastRowOnPage) {
        setPage(page - 1);
      } else {
        load(activeFilter, page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this registration.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <div className="dashboard">
        <div className="brand-row">
          <span className="brand-mark" />
          <p className="eyebrow">Technical Team · Admin</p>
        </div>
        <h1 style={{ marginBottom: 4 }}>Registrations</h1>
        <p className="subtitle" style={{ marginBottom: 20 }}>Logged in as {username}</p>

        <form className="dash-toolbar" onSubmit={handleSearch} role="search">
          <label htmlFor="event-search" className="visually-hidden">
            Filter registrations by event name
          </label>
          <input
            id="event-search"
            name="event-search"
            type="search"
            placeholder="Filter by event name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Search
          </button>
          <button className="btn-secondary" type="button" onClick={handleClear}>
            Clear
          </button>
          <button className="btn-secondary" type="button" onClick={handleExport}>
            Export CSV
          </button>
          <button className="btn-secondary" type="button" onClick={onLogout} style={{ marginLeft: "auto" }}>
            Log out
          </button>
        </form>

        {error && <div className="banner-error" role="alert">{error}</div>}
        {statusMessage && (
          <div className="banner-success" role="status" aria-live="polite">
            {statusMessage}
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="empty-state" role="status" aria-live="polite">
              <span className="spinner" />
              Loading registrations…
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">No registrations found.</div>
          ) : (
            <table>
              <caption className="visually-hidden">
                Event registrations, page {page + 1} of {totalPages}
              </caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Event</th>
                  <th>Registered At</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) =>
                  editingId === r.id && editValues ? (
                    <tr key={r.id}>
                      <td>
                        <label className="visually-hidden" htmlFor={`edit-fullName-${r.id}`}>Full name</label>
                        <input
                          id={`edit-fullName-${r.id}`}
                          value={editValues.fullName}
                          onChange={(e) => setEditValues({ ...editValues, fullName: e.target.value })}
                          aria-invalid={!!editErrors.fullName}
                        />
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`edit-email-${r.id}`}>Email</label>
                        <input
                          id={`edit-email-${r.id}`}
                          type="email"
                          value={editValues.email}
                          onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                          aria-invalid={!!editErrors.email}
                        />
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`edit-phone-${r.id}`}>Phone</label>
                        <input
                          id={`edit-phone-${r.id}`}
                          type="tel"
                          value={editValues.phone}
                          onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                          aria-invalid={!!editErrors.phone}
                        />
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`edit-department-${r.id}`}>Department</label>
                        <input
                          id={`edit-department-${r.id}`}
                          value={editValues.department}
                          onChange={(e) => setEditValues({ ...editValues, department: e.target.value })}
                          aria-invalid={!!editErrors.department}
                        />
                      </td>
                      <td>
                        <label className="visually-hidden" htmlFor={`edit-eventName-${r.id}`}>Event</label>
                        <select
                          id={`edit-eventName-${r.id}`}
                          value={editValues.eventName}
                          onChange={(e) => setEditValues({ ...editValues, eventName: e.target.value })}
                          aria-invalid={!!editErrors.eventName}
                        >
                          {EVENTS.map((ev) => (
                            <option key={ev} value={ev}>
                              {ev}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(r.registeredAt).toLocaleString()}</td>
                      <td className="row-actions">
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => saveEdit(r.id)}
                          disabled={editSaving}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                        <button className="btn-secondary" type="button" onClick={cancelEdit} disabled={editSaving}>
                          Cancel
                        </button>
                        {Object.values(editErrors).filter(Boolean).length > 0 && (
                          <div className="field-error" role="alert">
                            {Object.values(editErrors).find(Boolean)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id}>
                      <td>{r.fullName}</td>
                      <td>{r.email}</td>
                      <td>{r.phone}</td>
                      <td>{r.department}</td>
                      <td>
                        <span className="tag">{r.eventName}</span>
                      </td>
                      <td>{new Date(r.registeredAt).toLocaleString()}</td>
                      <td className="row-actions">
                        <button className="btn-secondary" type="button" onClick={() => startEdit(r)}>
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && registrations.length > 0 && (
          <nav className="pagination" aria-label="Registrations pages">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Previous
            </button>
            <span aria-live="polite">
              Page {page + 1} of {totalPages} · {total} total
            </span>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
            >
              Next →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
