package com.artbots.backend;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

// Everything to do with getting an uploaded image onto (and back off of) the
// local disk. The controller stays out of the filesystem entirely.
@Service
public class FileStorageService {

    // What we're willing to accept, and the extension we file each one under
    // when the uploaded name doesn't already carry a usable one.
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/gif", ".gif",
            "image/webp", ".webp");

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path uploadDir;

    public FileStorageService(@Value("${artbots.upload-dir:./uploads}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + this.uploadDir, e);
        }
    }

    // Validates the upload, writes it under a name nobody else can collide
    // with, and hands back that name for the caller to persist.
    public String store(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No image file was uploaded.");
        }

        String contentType = image.getContentType() == null
                ? ""
                : image.getContentType().toLowerCase(Locale.ROOT);

        if (!ALLOWED_TYPES.containsKey(contentType)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Upload a PNG, JPEG, GIF or WebP image.");
        }

        if (image.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That image is too large. The limit is 10 MB.");
        }

        String storedFilename = UUID.randomUUID() + extensionFor(image, contentType);
        Path target = uploadDir.resolve(storedFilename);

        try (var in = image.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Could not save the uploaded image.", e);
        }

        return storedFilename;
    }

    // Resolves a stored name back to a path, refusing anything that tries to
    // climb out of the upload directory.
    public Path resolve(String storedFilename) {
        Path target = uploadDir.resolve(storedFilename).normalize();
        if (!target.startsWith(uploadDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image reference.");
        }
        return target;
    }

    // Prefer the extension the user's own file had, so a .jpeg stays a .jpeg,
    // but only when it looks like a plain extension and not a path.
    private String extensionFor(MultipartFile image, String contentType) {
        String originalFilename = image.getOriginalFilename();
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot > -1) {
                String extension = originalFilename.substring(dot).toLowerCase(Locale.ROOT);
                if (extension.matches("\\.[a-z0-9]{1,5}")) {
                    return extension;
                }
            }
        }
        return ALLOWED_TYPES.get(contentType);
    }
}
