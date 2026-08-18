package com.artbots.backend;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChallengeController {

    private final ChallengeRepository challengeRepository;
    private final PromptRepository promptRepository;

    public ChallengeController(ChallengeRepository challengeRepository, PromptRepository promptRepository) {
        this.challengeRepository = challengeRepository;
        this.promptRepository = promptRepository;
    }

    @GetMapping("/api/challenges")
    public List<Challenge> getChallenges() {
        return challengeRepository.findAll();
    }

    @PostMapping("/api/challenges")
    public Challenge createChallenge(@RequestBody ChallengeRequest request) {
        Challenge challenge = new Challenge();
        challenge.setTitle(request.getTitle());
        challenge.setStartDate(request.getStartDate());
        challenge = challengeRepository.save(challenge);

        String[] items = request.getPrompts().split(",");
        for (int i = 0; i < items.length; i++) {
            Prompt prompt = new Prompt();
            prompt.setDayNumber(i + 1);
            prompt.setText(items[i].trim());
            prompt.setChallenge(challenge);
            promptRepository.save(prompt);
        }

        return challenge;
    }

    @GetMapping("/api/challenges/{id}/today")
    public TodayResponse getToday(@PathVariable Long id) {
        Challenge challenge = challengeRepository.findById(id).orElseThrow();

        // How many calendar days have passed since the challenge's
        // startDate, plus 1 so the start date itself is "day 1" rather
        // than "day 0".
        LocalDate startDate = LocalDate.parse(challenge.getStartDate());
        int dayNumber = (int) ChronoUnit.DAYS.between(startDate, LocalDate.now()) + 1;

        Prompt todayPrompt = challenge.getPrompts().stream()
                .filter(prompt -> prompt.getDayNumber() == dayNumber)
                .findFirst()
                .orElse(null);

        TodayResponse response = new TodayResponse();
        response.setDayNumber(dayNumber);
        response.setPromptText(todayPrompt != null ? todayPrompt.getText() : null);
        return response;
    }
}
