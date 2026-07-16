package com.club.registration.dto;

public class AuthResponse {
    public String token;
    public String username;

    public AuthResponse(String token, String username) {
        this.token = token;
        this.username = username;
    }
}
