package com.artbots.backend;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final ChallengeRepository challengeRepository;

    public SubmissionController(SubmissionRepository submissionRepository, ChallengeRepository challengeRepository) {
        this.submissionRepository = submissionRepository;
        this.challengeRepository = challengeRepository;
    }

    @GetMapping("/api/submissions")
    public List<Submission> getSubmissions() {
        return submissionRepository.findAll();
    }

    @PostMapping("/api/submissions")
    public Submission createSubmission(@RequestBody SubmissionRequest request) {
        Challenge challenge = challengeRepository.findById(request.getChallengeId()).orElseThrow();

        Submission submission = new Submission();
        submission.setUrl(request.getUrl());
        submission.setDayNumber(request.getDayNumber());
        submission.setChallenge(challenge);

        return submissionRepository.save(submission);
    }
}
