package com.club.registration.model;

import io.quarkus.mongodb.panache.PanacheMongoEntity;
import io.quarkus.mongodb.panache.common.MongoEntity;

import java.time.Instant;

@MongoEntity(collection = "users")
public class User extends PanacheMongoEntity {

    public String username;   // stored lowercase, unique
    public String email;
    public String passwordHash; // bcrypt
    public Instant createdAt = Instant.now();

    // Forgot-password: the raw token is only ever emailed to the user, never
    // stored. What's persisted is a SHA-256 hash of it, so a database leak
    // doesn't hand out working reset links. Cleared after use or expiry.
    public String resetTokenHash;
    public Instant resetTokenExpiry;

    public static User findByUsername(String username) {
        return find("username", username.toLowerCase().trim()).firstResult();
    }

    public static User findByEmail(String email) {
        return find("email", email.trim()).firstResult();
    }

    public static User findByResetTokenHash(String tokenHash) {
        return find("resetTokenHash", tokenHash).firstResult();
    }

    public static boolean usernameTaken(String username) {
        return findByUsername(username) != null;
    }
}
