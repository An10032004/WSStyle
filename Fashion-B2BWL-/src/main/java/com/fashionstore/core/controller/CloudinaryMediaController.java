package com.fashionstore.core.controller;

import com.fashionstore.core.service.CloudinarySignatureService;
import com.fashionstore.core.service.CloudinarySignatureService.SignatureResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/media/cloudinary")
public class CloudinaryMediaController {

    private final CloudinarySignatureService signatureService;

    public CloudinaryMediaController(CloudinarySignatureService signatureService) {
        this.signatureService = signatureService;
    }

    /**
     * Returns signed parameters for direct browser upload to Cloudinary.
     * Do not expose API secret to the client; only signature + timestamp + apiKey + cloudName.
     */
    @PostMapping("/signature")
    public ResponseEntity<?> sign(@RequestBody(required = false) Map<String, String> body) {
        try {
            String folder = body != null ? body.get("folder") : null;
            SignatureResult r = signatureService.signUpload(folder);
            return ResponseEntity.ok(Map.of(
                    "cloudName", r.cloudName(),
                    "apiKey", r.apiKey(),
                    "timestamp", r.timestamp(),
                    "signature", r.signature(),
                    "folder", r.folder()
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "configured", false,
                    "message", ex.getMessage()
            ));
        }
    }
}
