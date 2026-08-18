package com.artbots.backend;

// The non-file half of a submission. Bound off the multipart form fields that
// travel alongside the image part.
public class SubmissionRequest {

    private int dayNumber;
    private Long challengeId;

    public int getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }

    public Long getChallengeId() {
        return challengeId;
    }

    public void setChallengeId(Long challengeId) {
        this.challengeId = challengeId;
    }
}
