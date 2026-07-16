package com.club.registration.model;

import io.quarkus.mongodb.panache.PanacheMongoEntity;
import io.quarkus.mongodb.panache.common.MongoEntity;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;

@MongoEntity(collection = "registrations")
public class Registration extends PanacheMongoEntity {

    @NotBlank(message = "Full name is required")
    public String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    public String email;

    @NotBlank(message = "Phone number is required")
    public String phone;

    @NotBlank(message = "College/Department is required")
    public String department;

    @NotBlank(message = "Event is required")
    public String eventName;

    public Instant registeredAt = Instant.now();

    private static final Sort NEWEST_FIRST = Sort.by("registeredAt", Sort.Direction.Descending);

    // Case-insensitive partial match, e.g. "hack" finds "Hackathon 2026".
    public static List<Registration> findByEventNameContaining(String query) {
        return list("{'eventName': {$regex: ?1, $options: 'i'}}", NEWEST_FIRST, Pattern.quote(query));
    }

    public static List<Registration> findPage(String eventFilter, int page, int size) {
        if (eventFilter == null || eventFilter.isBlank()) {
            return findAll(NEWEST_FIRST).page(Page.of(page, size)).list();
        }
        return find("{'eventName': {$regex: ?1, $options: 'i'}}", NEWEST_FIRST, Pattern.quote(eventFilter))
                .page(Page.of(page, size)).list();
    }

    public static long countMatching(String eventFilter) {
        if (eventFilter == null || eventFilter.isBlank()) {
            return count();
        }
        return find("{'eventName': {$regex: ?1, $options: 'i'}}", Pattern.quote(eventFilter)).count();
    }

    public static List<Registration> findAllMatching(String eventFilter) {
        if (eventFilter == null || eventFilter.isBlank()) {
            return listAll(NEWEST_FIRST);
        }
        return findByEventNameContaining(eventFilter);
    }
}
