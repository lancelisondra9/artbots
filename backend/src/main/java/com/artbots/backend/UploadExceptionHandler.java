package com.artbots.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

// The servlet container trips its own size limit while it's still parsing the
// multipart body, which is before the dispatcher has picked a handler -- so a
// handler-local @ExceptionHandler never gets a look at it. Advice does, and
// without it the browser just gets an empty 413 with nothing to show the user.
@RestControllerAdvice
public class UploadExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest().body("That image is too large. The limit is 10 MB.");
    }
}
