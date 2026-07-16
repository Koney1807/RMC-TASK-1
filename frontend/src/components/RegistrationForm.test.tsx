import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RegistrationForm from "./RegistrationForm";
import * as client from "../api/client";

describe("RegistrationForm", () => {
  it("shows validation errors and focuses the first invalid field on empty submit", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Phone number is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toHaveFocus();
  });

  it("rejects an invalid phone number without touching the server", async () => {
    const submitSpy = vi.spyOn(client, "submitRegistration");
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Phone Number"), "call-me-maybe");
    await user.type(screen.getByLabelText("College / Department"), "Computer Science");
    await user.selectOptions(
      screen.getByLabelText("Which event are you registering for?"),
      "Hackathon 2026"
    );
    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText("Enter a valid phone number.")).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("submits trimmed values and shows a confirmation banner on success", async () => {
    const submitSpy = vi.spyOn(client, "submitRegistration").mockResolvedValue({
      id: "abcdef123456",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555 123 4567",
      department: "Computer Science",
      eventName: "Hackathon 2026",
      registeredAt: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText("Full Name"), "  Ada Lovelace  ");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Phone Number"), "+1 555 123 4567");
    await user.type(screen.getByLabelText("College / Department"), "Computer Science");
    await user.selectOptions(
      screen.getByLabelText("Which event are you registering for?"),
      "Hackathon 2026"
    );
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Ada Lovelace" }) // trimmed, not "  Ada Lovelace  "
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/you're registered/i);
  });

  it("surfaces a server error (e.g. duplicate registration) without crashing", async () => {
    vi.spyOn(client, "submitRegistration").mockRejectedValue(
      new Error("This email is already registered for that event.")
    );
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Phone Number"), "+1 555 123 4567");
    await user.type(screen.getByLabelText("College / Department"), "Computer Science");
    await user.selectOptions(
      screen.getByLabelText("Which event are you registering for?"),
      "Hackathon 2026"
    );
    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already registered/i);
  });
});
