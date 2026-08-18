package com.artbots.backend;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;


@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;


    public SubmissionController(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @GetMapping("/api/submissions")
    public List<Submission> getSubmissions() {
        return submissionRepository.findAll();
    }

    @PostMapping("/api/submissions")
    public Submission createSubmission(@RequestBody Submission submission) {
        return submissionRepository.save(submission);
    }
}



    

