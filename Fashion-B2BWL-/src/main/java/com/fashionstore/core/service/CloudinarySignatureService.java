package com.fashionstore.core.service;

import com.fashionstore.core.config.CloudinaryProperties;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.TreeMap;

@Service
public class CloudinarySignatureService {

    private final CloudinaryProperties props;

    public CloudinarySignatureService(CloudinaryProperties props) {
        this.props = props;
    }

    public record SignatureResult(
            String cloudName,
            String apiKey,
            long timestamp,
            String signature,
            String folder
    ) {}

    /**
     * Builds a signed payload for browser-direct upload to Cloudinary.
     * See: https://cloudinary.com/documentation/authentication_signatures
     */
    public SignatureResult signUpload(String requestedFolder) {
        if (!props.isConfigured()) {
            throw new IllegalStateException("Cloudinary is not configured");
        }
        long timestamp = System.currentTimeMillis() / 1000L;
        String folder = (requestedFolder != null && !requestedFolder.isBlank())
                ? requestedFolder.trim()
                : (props.getUploadFolder() != null ? props.getUploadFolder().trim() : "");

        TreeMap<String, String> toSign = new TreeMap<>();
        toSign.put("timestamp", Long.toString(timestamp));
        if (!folder.isEmpty()) {
            toSign.put("folder", folder);
        }

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : toSign.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        String stringToSign = sb.toString();
        String signature = sha1Hex(stringToSign + props.getApiSecret());

        return new SignatureResult(
                props.getCloudName().trim(),
                props.getApiKey().trim(),
                timestamp,
                signature,
                folder
        );
    }

    private static String sha1Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 not available", e);
        }
    }
}
