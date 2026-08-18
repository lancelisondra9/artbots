package com.artbots.backend;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final ChallengeRepository challengeRepository;
    private final FileStorageService fileStorageService;

    public SubmissionController(SubmissionRepository submissionRepository, ChallengeRepository challengeRepository,
            FileStorageService fileStorageService) {
        this.submissionRepository = submissionRepository;
        this.challengeRepository = challengeRepository;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping("/api/submissions")
    public List<Submission> getSubmissions() {
        return submissionRepository.findAll();
    }

    @PostMapping(path = "/api/submissions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Submission createSubmission(@RequestPart("image") MultipartFile image,
            @ModelAttribute SubmissionRequest request) {
        Challenge challenge = challengeRepository.findById(request.getChallengeId()).orElseThrow();

        // Validate and write the file first -- no row unless the bytes landed.
        String storedFilename = fileStorageService.store(image);

        Submission submission = new Submission();
        submission.setStoredFilename(storedFilename);
        submission.setOriginalFilename(image.getOriginalFilename());
        submission.setContentType(image.getContentType());
        submission.setSizeBytes(image.getSize());
        submission.setDayNumber(request.getDayNumber());
        submission.setChallenge(challenge);

        return submissionRepository.save(submission);
    }

    @GetMapping("/api/submissions/{id}/image")
    public ResponseEntity<Resource> getSubmissionImage(@PathVariable Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such submission."));

        Path file = fileStorageService.resolve(submission.getStoredFilename());
        if (!Files.isReadable(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "The stored image is missing.");
        }

        MediaType contentType = submission.getContentType() == null
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(submission.getContentType());

        long length;
        try {
            length = Files.size(file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read the stored image.", e);
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .contentLength(length)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new FileSystemResource(file));
    }

    // The servlet container trips its own size limit before our 10 MB check
    // ever runs, and that lands here as a 500 unless we say otherwise.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest().body("That image is too large. The limit is 10 MB.");
    }
}
