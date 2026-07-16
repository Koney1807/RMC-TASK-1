package com.club.registration.resource;

import com.club.registration.dto.RegistrationRequest;
import com.club.registration.model.Registration;
import com.mongodb.MongoWriteException;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.bson.types.ObjectId;
import org.jboss.logging.Logger;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RegistrationResource {

    private static final Logger LOG = Logger.getLogger(RegistrationResource.class);
    private static final int DEFAULT_PAGE_SIZE = 25;
    private static final int MAX_PAGE_SIZE = 200;

    // ---- Part A: public registration form submits here ----
    @POST
    @Path("/registrations")
    @PermitAll
    public Response register(@Valid RegistrationRequest request) {
        Registration registration = new Registration();
        registration.fullName = request.fullName;
        registration.email = request.email.trim().toLowerCase();
        registration.phone = request.phone;
        registration.department = request.department;
        registration.eventName = request.eventName;

        try {
            registration.persist();
        } catch (MongoWriteException e) {
            // The unique (email, eventName) index rejects a second
            // registration for the same event by the same person - e.g. a
            // double-clicked submit button, or someone re-submitting the
            // form after a network blip made it look like it hadn't gone
            // through the first time.
            if (e.getError().getCode() == 11000) {
                return Response.status(Response.Status.CONFLICT)
                        .entity(Map.of("message", "This email is already registered for that event.")).build();
            }
            LOG.error("Unexpected error persisting registration", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("message", "Could not save your registration. Please try again.")).build();
        }

        return Response.status(Response.Status.CREATED).entity(registration).build();
    }

    // ---- Part B: admin dashboard endpoints, protected by RolesAllowed("admin") (see application.properties) ----

    @GET
    @Path("/admin/registrations")
    @RolesAllowed("user")
    public Response listRegistrations(
            @QueryParam("event") String event,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("" + DEFAULT_PAGE_SIZE) int size) {
        if (page < 0) page = 0;
        if (size <= 0) size = DEFAULT_PAGE_SIZE;
        if (size > MAX_PAGE_SIZE) size = MAX_PAGE_SIZE;

        List<Registration> results = Registration.findPage(event, page, size);
        long total = Registration.countMatching(event);

        return Response.ok(results)
                .header("X-Total-Count", total)
                .header("X-Page", page)
                .header("X-Page-Size", size)
                .build();
    }

    @DELETE
    @Path("/admin/registrations/{id}")
    @RolesAllowed("user")
    public Response deleteRegistration(@PathParam("id") String id) {
        ObjectId objectId = parseId(id);
        if (objectId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Invalid registration id.")).build();
        }
        boolean deleted = Registration.deleteById(objectId);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("message", "Registration not found.")).build();
        }
        return Response.noContent().build();
    }

    @PUT
    @Path("/admin/registrations/{id}")
    @RolesAllowed("user")
    public Response updateRegistration(@PathParam("id") String id, @Valid RegistrationRequest request) {
        ObjectId objectId = parseId(id);
        if (objectId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Invalid registration id.")).build();
        }
        Registration existing = Registration.findById(objectId);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("message", "Registration not found.")).build();
        }

        existing.fullName = request.fullName;
        existing.email = request.email.trim().toLowerCase();
        existing.phone = request.phone;
        existing.department = request.department;
        existing.eventName = request.eventName;

        try {
            existing.update();
        } catch (MongoWriteException e) {
            if (e.getError().getCode() == 11000) {
                return Response.status(Response.Status.CONFLICT)
                        .entity(Map.of("message", "This email is already registered for that event.")).build();
            }
            LOG.error("Unexpected error updating registration", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("message", "Could not update this registration. Please try again.")).build();
        }

        return Response.ok(existing).build();
    }

    @GET
    @Path("/admin/registrations/export")
    @RolesAllowed("user")
    @Produces("text/csv")
    public Response exportCsv(@QueryParam("event") String event) {
        // Exports respect the current search filter, so "export" means
        // "export what I'm looking at", not always the entire table.
        List<Registration> all = Registration.findAllMatching(event);
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;

        StringBuilder csv = new StringBuilder();
        csv.append("Full Name,Email,Phone,Department,Event,Registered At\n");
        for (Registration r : all) {
            csv.append(escape(r.fullName)).append(",")
               .append(escape(r.email)).append(",")
               .append(escape(r.phone)).append(",")
               .append(escape(r.department)).append(",")
               .append(escape(r.eventName)).append(",")
               .append(r.registeredAt != null ? fmt.format(r.registeredAt) : "")
               .append("\n");
        }

        return Response.ok(csv.toString())
                .header("Content-Disposition", "attachment; filename=registrations.csv")
                .build();
    }

    @GET
    @Path("/admin/me")
    @RolesAllowed("user")
    public Map<String, Object> me() {
        return Map.of("authenticated", true);
    }

    private ObjectId parseId(String id) {
        try {
            return new ObjectId(id);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String escape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
