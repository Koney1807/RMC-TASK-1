package com.club.registration.resource;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {

    private String uniqueUsername() {
        return "user_" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void signupThenLoginSucceeds() {
        String username = uniqueUsername();
        String body = """
                {"username": "%s", "email": "%s@example.com", "password": "correcthorse"}
                """.formatted(username, username);

        given().contentType("application/json").body(body)
                .when().post("/api/auth/signup")
                .then().statusCode(201)
                .body("username", equalTo(username))
                .body("token", notNullValue());

        String loginBody = """
                {"username": "%s", "password": "correcthorse"}
                """.formatted(username);

        given().contentType("application/json").body(loginBody)
                .when().post("/api/auth/login")
                .then().statusCode(200)
                .body("username", equalTo(username))
                .body("token", notNullValue());
    }

    @Test
    void signupWithTakenUsernameReturnsConflict() {
        String username = uniqueUsername();
        String body = """
                {"username": "%s", "email": "%s@example.com", "password": "correcthorse"}
                """.formatted(username, username);

        given().contentType("application/json").body(body)
                .when().post("/api/auth/signup")
                .then().statusCode(201);

        // Same username again (even with a different email/password) should be rejected.
        String secondBody = """
                {"username": "%s", "email": "other-%s@example.com", "password": "differentpass"}
                """.formatted(username, username);

        given().contentType("application/json").body(secondBody)
                .when().post("/api/auth/signup")
                .then().statusCode(409);
    }

    @Test
    void signupWithInvalidUsernameCharactersIsRejected() {
        String body = """
                {"username": "not a valid username!", "email": "invalid@example.com", "password": "correcthorse"}
                """;

        given().contentType("application/json").body(body)
                .when().post("/api/auth/signup")
                .then().statusCode(400);
    }

    @Test
    void signupWithShortPasswordIsRejected() {
        String username = uniqueUsername();
        String body = """
                {"username": "%s", "email": "%s@example.com", "password": "short"}
                """.formatted(username, username);

        given().contentType("application/json").body(body)
                .when().post("/api/auth/signup")
                .then().statusCode(400);
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        String username = uniqueUsername();
        String signupBody = """
                {"username": "%s", "email": "%s@example.com", "password": "correcthorse"}
                """.formatted(username, username);
        given().contentType("application/json").body(signupBody)
                .when().post("/api/auth/signup")
                .then().statusCode(201);

        String loginBody = """
                {"username": "%s", "password": "wrongpassword"}
                """.formatted(username);

        given().contentType("application/json").body(loginBody)
                .when().post("/api/auth/login")
                .then().statusCode(401);
    }

    @Test
    void loginIsRateLimitedAfterRepeatedFailures() {
        String username = uniqueUsername();
        String signupBody = """
                {"username": "%s", "email": "%s@example.com", "password": "correcthorse"}
                """.formatted(username, username);
        given().contentType("application/json").body(signupBody)
                .when().post("/api/auth/signup")
                .then().statusCode(201);

        String badLoginBody = """
                {"username": "%s", "password": "wrongpassword"}
                """.formatted(username);

        // The limiter allows 10 attempts per minute per (ip, username); the
        // 11th should be throttled instead of returning another 401.
        for (int i = 0; i < 10; i++) {
            given().contentType("application/json").body(badLoginBody)
                    .when().post("/api/auth/login")
                    .then().statusCode(401);
        }

        given().contentType("application/json").body(badLoginBody)
                .when().post("/api/auth/login")
                .then().statusCode(429);
    }

    @Test
    void adminRouteRequiresAuthentication() {
        given().when().get("/api/admin/registrations")
                .then().statusCode(401);
    }
}
