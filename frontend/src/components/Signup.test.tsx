import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Signup from "./Signup";
import * as client from "../api/client";

describe("Signup", () => {
  it("rejects mismatched passwords without calling the server", async () => {
    const signupSpy = vi.spyOn(client, "signup");
    const user = userEvent.setup();
    render(<Signup onSignedUp={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "ada_lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm Password"), "differenthorse");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/don't match/i);
    expect(signupSpy).not.toHaveBeenCalled();
  });

  it("rejects a username with disallowed characters without calling the server", async () => {
    const signupSpy = vi.spyOn(client, "signup");
    const user = userEvent.setup();
    render(<Signup onSignedUp={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "not a valid username!");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm Password"), "correcthorse");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/letters, numbers/i);
    expect(signupSpy).not.toHaveBeenCalled();
  });

  it("surfaces a duplicate-username error from the server", async () => {
    vi.spyOn(client, "signup").mockRejectedValue(new Error("That username is already taken."));
    const onSignedUp = vi.fn();
    const user = userEvent.setup();
    render(<Signup onSignedUp={onSignedUp} />);

    await user.type(screen.getByLabelText("Username"), "ada_lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm Password"), "correcthorse");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already taken/i);
    expect(onSignedUp).not.toHaveBeenCalled();
  });

  it("calls onSignedUp with the returned username on success", async () => {
    vi.spyOn(client, "signup").mockResolvedValue({ token: "fake-jwt", username: "ada_lovelace" });
    const onSignedUp = vi.fn();
    const user = userEvent.setup();
    render(<Signup onSignedUp={onSignedUp} />);

    await user.type(screen.getByLabelText("Username"), "ada_lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm Password"), "correcthorse");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(onSignedUp).toHaveBeenCalledWith("ada_lovelace"));
  });
});
