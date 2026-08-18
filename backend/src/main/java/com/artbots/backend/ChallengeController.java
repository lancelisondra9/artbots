package com.artbots.backend;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class ChallengeController {

    private final ChallengeRepository challengeRepository;


    public ChallengeController(ChallengeRepository challengeRepository) {
        this.challengeRepository = challengeRepository;
    }

    @GetMapping("/api/challenges")
    public List<Challenge> getChallenges() {
        return challengeRepository.findAll();
    }

    @PostMapping("/api/challenges")
    public Challenge createChallenge(@RequestBody Challenge challenge) {
        return challengeRepository.save(challenge);
    }
}



    

