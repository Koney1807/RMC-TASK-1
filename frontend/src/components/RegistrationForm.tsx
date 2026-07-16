import { FormEvent, useState } from "react";
import { submitRegistration, Registration } from "../api/client";

import { EVENTS } from "../constants";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  eventName: string;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  department: "",
  eventName: "",
};

const PHONE_PATTERN = /^[+()\-\s\d]{7,20}$/;

function validate(values: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!values.department.trim()) errors.department = "College/Department is required.";
  if (!values.eventName) errors.eventName = "Please select an event.";
  return errors;
}

function trimmed(values: FormState): FormState {
  return {
    ...values,
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    department: values.department.trim(),
  };
}

export default function RegistrationForm() {
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Registration | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function handleChange(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstField = Object.keys(validationErrors)[0];
      document.getElementById(firstField)?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const registration = await submitRegistration(trimmed(values));
      setSubmitted(registration);
      setValues(initialState);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="brand-row">
        <span className="brand-mark" />
        <p className="eyebrow">Technical Team · Club Events</p>
      </div>
      <h1>Event Registration</h1>
      <p className="subtitle">
        Fill in your details below to register for an upcoming club event. You'll
        get a confirmation on screen the moment it's saved.
      </p>

      <div className="card">
        {submitted && (
          <div className="banner-success" role="status">
            You're registered! We've saved your details — see you at the event.
            <br />
            <span className="badge-id">BADGE #{submitted.id.slice(-8).toUpperCase()}</span>
          </div>
        )}
        {serverError && <div className="banner-error" role="alert">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="name"
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
            />
            {errors.fullName && (
              <div className="field-error" id="fullName-error" role="alert">
                {errors.fullName}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <div className="field-error" id="email-error" role="alert">
                {errors.email}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <div className="field-error" id="phone-error" role="alert">
                {errors.phone}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="department">College / Department</label>
            <input
              id="department"
              name="organization"
              autoComplete="organization"
              value={values.department}
              onChange={(e) => handleChange("department", e.target.value)}
              aria-invalid={!!errors.department}
              aria-describedby={errors.department ? "department-error" : undefined}
            />
            {errors.department && (
              <div className="field-error" id="department-error" role="alert">
                {errors.department}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="eventName">Which event are you registering for?</label>
            <select
              id="eventName"
              name="eventName"
              value={values.eventName}
              onChange={(e) => handleChange("eventName", e.target.value)}
              aria-invalid={!!errors.eventName}
              aria-describedby={errors.eventName ? "eventName-error" : undefined}
            >
              <option value="">Select an event…</option>
              {EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
            {errors.eventName && (
              <div className="field-error" id="eventName-error" role="alert">
                {errors.eventName}
              </div>
            )}
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Register"}
          </button>
        </form>
      </div>

      <a className="footer-link" href="/admin">
        Admin login →
      </a>
    </div>
  );
}
