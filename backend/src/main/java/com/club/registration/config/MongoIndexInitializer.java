package com.club.registration.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.bson.Document;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The application already refuses to sign up a username that's taken
 * (User.usernameTaken), but that's a check-then-act that two concurrent
 * signups could both pass. A unique index on `users.username` makes Mongo
 * itself the source of truth, closing that race; AuthResource#signup catches
 * the resulting duplicate-key error and turns it into a normal 409 response.
 *
 * Also adds a compound index on `registrations.(email, eventName)` so the
 * same person can't end up registered twice for the same event - two
 * submissions racing (e.g. a double-clicked submit button) are now rejected
 * by the database instead of creating a duplicate record.
 */
@ApplicationScoped
public class MongoIndexInitializer {

    private static final Logger LOG = Logger.getLogger(MongoIndexInitializer.class);

    @Inject
    MongoClient mongoClient;

    @ConfigProperty(name = "quarkus.mongodb.database")
    String databaseName;

    void onStart(@Observes StartupEvent ev) {
        try {
            MongoCollection<Document> users = mongoClient
                    .getDatabase(databaseName)
                    .getCollection("users");
            users.createIndex(Indexes.ascending("username"), new IndexOptions().unique(true));

            MongoCollection<Document> registrations = mongoClient
                    .getDatabase(databaseName)
                    .getCollection("registrations");
            registrations.createIndex(
                    Indexes.ascending("email", "eventName"),
                    new IndexOptions().unique(true));
        } catch (Exception e) {
            // Don't block application startup if Mongo isn't reachable yet
            // (e.g. local dev without a running instance); the index will
            // simply be created on the next successful startup.
            LOG.warn("Could not ensure unique indexes", e);
        }
    }
}
