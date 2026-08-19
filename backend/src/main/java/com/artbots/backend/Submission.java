package com.artbots.backend;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Transient;

@Entity

public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)




    private Long id;
    private String storedFilename;
    private String originalFilename;
    private String contentType;
    // Boxed on purpose: a primitive maps to a NOT NULL column, and ddl-auto
    // can't add one of those to a table that already has rows. Submissions
    // from before the image upload existed simply have no size.
    private Long sizeBytes;
    private int dayNumber;
    private String submitDate;
    //private LocalDateTime localDate;
    @ManyToOne
    private Challenge challenge;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public void setStoredFilename(String storedFilename) {
        this.storedFilename = storedFilename;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    // Not a column -- it just rides along in the JSON so the frontend has a
    // single thing to point an <img> at, rather than assembling the path
    // itself out of the id.
    @Transient
    public String getImageUrl() {
        return id == null ? null : "/api/submissions/" + id + "/image";
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }

    public String getSubmitDate() {
        return submitDate;
    }

    public void setSubmitDate(String submitDate) {
        this.submitDate = submitDate;
    }

    public Challenge getChallenge() {
        return challenge;
    }

    public void setChallenge(Challenge challenge) {
        this.challenge = challenge;
    }




}
