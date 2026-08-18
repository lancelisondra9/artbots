package com.artbots.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @RestController tells Spring two things at once:
 * 1. This class handles incoming HTTP requests (it's a "controller").
 * 2. Whatever the methods return should be written directly into the
 *    HTTP response body (as JSON/text), NOT resolved to an HTML template.
 *    (That second part is what makes it "REST" instead of a regular
 *    @Controller, which is meant for server-rendered web pages.)
 * 
 */

@RestController
public class HelloController {

    /**
     * @GetMapping("/api/hello") registers this method against a specific
     * route + HTTP verb. Spring's dispatcher watches for incoming
     * requests, and when one matches "GET /api/hello", it calls this
     * method and takes whatever it returns.
     *
     * Because the class is @RestController, returning a plain String
     * here is enough — Spring writes it straight into the response body
     * with a 200 OK status. No manual response-building needed.
     */
    @GetMapping("/api/hello")
    public String hello() {
        return "Hello from Spring Boot!";
    }
}
