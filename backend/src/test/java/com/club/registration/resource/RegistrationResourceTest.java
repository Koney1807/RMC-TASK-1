package com.club.registration.resource;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class RegistrationResourceTest {

    private String uniqueEmail() {
        return "reg_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    /** Signs up a fresh admin-dashboard user and returns their bearer token. */
    private String freshToken() {
        String username = "admin_" + UUID.randomUUID().toString().substring(0, 8);
        String body = """
                {"username": "%s", "email": "%s@example.com", "password": "correcthorse"}
                """.formatted(username, username);
        return given().contentType(ContentType.JSON).body(body)
                .when().post("/api/auth/signup")
                .then().statusCode(201)
                .extract().path("token");
    }

    private String registrationPayload(String email, String eventName) {
        return """
                {"fullName": "Ada Lovelace", "email": "%s", "phone": "+1 555 123 4567",
                 "department": "Computer Science", "eventName": "%s"}
                """.formatted(email, eventName);
    }

    @Test
    void publicRegistrationSucceeds() {
        given().contentType(ContentType.JSON).body(registrationPayload(uniqueEmail(), "Hackathon 2026"))
                .when().post("/api/registrations")
                .then().statusCode(201)
                .body("fullName", equalTo("Ada Lovelace"));
    }

    @Test
    void duplicateRegistrationForSameEventIsRejected() {
        String email = uniqueEmail();
        String payload = registrationPayload(email, "Hackathon 2026");

        given().contentType(ContentType.JSON).body(payload)
                .when().post("/api/registrations")
                .then().statusCode(201);

        // Same email + same event again should be rejected as a duplicate.
        given().contentType(ContentType.JSON).body(payload)
                .when().post("/api/registrations")
                .then().statusCode(409);
    }

    @Test
    void sameEmailCanRegisterForADifferentEvent() {
        String email = uniqueEmail();

        given().contentType(ContentType.JSON).body(registrationPayload(email, "Hackathon 2026"))
                .when().post("/api/registrations")
                .then().statusCode(201);

        // Different event, same person - should be allowed.
        given().contentType(ContentType.JSON).body(registrationPayload(email, "Web Dev Bootcamp"))
                .when().post("/api/registrations")
                .then().statusCode(201);
    }

    @Test
    void invalidPhoneNumberIsRejected() {
        String body = """
                {"fullName": "Ada Lovelace", "email": "%s", "phone": "not-a-phone!!",
                 "department": "Computer Science", "eventName": "Hackathon 2026"}
                """.formatted(uniqueEmail());

        given().contentType(ContentType.JSON).body(body)
                .when().post("/api/registrations")
                .then().statusCode(400);
    }

    @Test
    void listRegistrationsRequiresAuthentication() {
        given().when().get("/api/admin/registrations")
                .then().statusCode(401);
    }

    @Test
    void adminCanListSearchEditAndDeleteRegistrations() {
        String token = freshToken();
        String email = uniqueEmail();
        String eventName = "Tech Talk: AI in Practice";

        String id = given().contentType(ContentType.JSON).body(registrationPayload(email, eventName))
                .when().post("/api/registrations")
                .then().statusCode(201)
                .extract().path("id");

        // Shows up in an unfiltered listing, with pagination metadata.
        given().header("Authorization", "Bearer " + token)
                .when().get("/api/admin/registrations")
                .then().statusCode(200)
                .header("X-Total-Count", notNullValue())
                .body("size()", greaterThanOrEqualTo(1));

        // Filtering by event name finds it.
        given().header("Authorization", "Bearer " + token)
                .queryParam("event", "AI in Practice")
                .when().get("/api/admin/registrations")
                .then().statusCode(200)
                .body("fullName", hasSize(greaterThanOrEqualTo(1)));

        // Editing it works and persists.
        String updatedPayload = registrationPayload(email, "Web Dev Bootcamp");
        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON).body(updatedPayload)
                .when().put("/api/admin/registrations/" + id)
                .then().statusCode(200)
                .body("eventName", equalTo("Web Dev Bootcamp"));

        // Deleting it works, and a second delete reports not-found.
        given().header("Authorization", "Bearer " + token)
                .when().delete("/api/admin/registrations/" + id)
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + token)
                .when().delete("/api/admin/registrations/" + id)
                .then().statusCode(404);
    }

    @Test
    void csvExportRequiresAuthenticationAndReturnsCsv() {
        given().when().get("/api/admin/registrations/export")
                .then().statusCode(401);

        String token = freshToken();
        given().header("Authorization", "Bearer " + token)
                .when().get("/api/admin/registrations/export")
                .then().statusCode(200)
                .header("Content-Disposition", containsString("registrations.csv"));
    }
}
