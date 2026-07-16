package com.club.registration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegistrationRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name is too long")
    public String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 254, message = "Email is too long")
    public String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[+()\\-\\s\\d]{7,20}$", message = "Enter a valid phone number")
    public String phone;

    @NotBlank(message = "College/Department is required")
    @Size(max = 150, message = "College/Department is too long")
    public String department;

    @NotBlank(message = "Please select an event")
    @Size(max = 150, message = "Event name is too long")
    public String eventName;
}
