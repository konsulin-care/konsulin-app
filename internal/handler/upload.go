package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"time"
)

var uploadHTTPClient = &http.Client{Timeout: 30 * time.Second}

// UploadOptions configures the upload handler with Cloudinary credentials.
type UploadOptions struct {
	CloudinaryCloudName    string
	CloudinaryUploadPreset string
	// Optional — overrides the Cloudinary API base URL for testing.
	CloudinaryBaseURL string
}

type uploadResponse struct {
	URL string `json:"url"`
}

// cloudinaryUploadResp maps the Cloudinary upload API JSON response.
type cloudinaryUploadResp struct {
	SecureURL string `json:"secure_url"`
	Error     *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// NewUploadHandler returns a handler for POST /api/media/location.
//
// It reads the file from the multipart form field "file", uploads it to
// Cloudinary's unsigned upload endpoint, and returns {"url": "..."}.
func NewUploadHandler(opts UploadOptions) http.HandlerFunc {
	cloudURL := opts.CloudinaryBaseURL
	if cloudURL == "" {
		cloudURL = fmt.Sprintf("https://api.cloudinary.com/v1_1/%s", opts.CloudinaryCloudName)
	}
	uploadURL := cloudURL + "/auto/upload"

	return func(w http.ResponseWriter, r *http.Request) {
		file, _, err := r.FormFile("file")
		if err != nil {
			writeUploadError(w, "missing file", http.StatusBadRequest)
			return
		}
		defer func() {
			if cerr := file.Close(); cerr != nil {
				slog.Warn("upload: failed to close uploaded file", "err", cerr)
			}
		}()

		url, cldErr := uploadToCloudinary(file, uploadURL, opts.CloudinaryUploadPreset)
		if cldErr != nil {
			slog.Error("upload: cloudinary upload failed", "err", cldErr.Err, "status", cldErr.StatusCode)
			writeUploadError(w, cldErr.Message, cldErr.StatusCode)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(uploadResponse{URL: url})
	}
}

// cloudinaryError holds an upload error with its intended HTTP status.
type cloudinaryError struct {
	Err        error
	Message    string
	StatusCode int
}

// uploadToCloudinary sends a file to Cloudinary's unsigned upload endpoint
// and returns the secure URL.
func uploadToCloudinary(file io.Reader, uploadURL, uploadPreset string) (string, *cloudinaryError) {
	body, err := buildCloudinaryBody(file, uploadPreset)
	if err != nil {
		return "", &cloudinaryError{Err: err, Message: "internal error", StatusCode: http.StatusInternalServerError}
	}

	resp, err := uploadHTTPClient.Post(uploadURL, body.ContentType, &body.Buffer)
	if err != nil {
		return "", &cloudinaryError{Err: err, Message: "upload service unreachable", StatusCode: http.StatusBadGateway}
	}
	defer func() {
		if cerr := resp.Body.Close(); cerr != nil {
			slog.Warn("upload: failed to close response body", "err", cerr)
		}
	}()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", &cloudinaryError{Err: err, Message: "internal error", StatusCode: http.StatusInternalServerError}
	}

	if resp.StatusCode != http.StatusOK {
		return "", &cloudinaryError{
			Err:        fmt.Errorf("cloudinary returned %d", resp.StatusCode),
			Message:    fmt.Sprintf("upload failed: %s", http.StatusText(resp.StatusCode)),
			StatusCode: http.StatusBadGateway,
		}
	}

	url, err := parseCloudinaryResponse(raw)
	if err != nil {
		return "", &cloudinaryError{Err: err, Message: "internal error", StatusCode: http.StatusInternalServerError}
	}

	return url, nil
}

// cloudinaryBody holds a pre-built multipart payload and its Content-Type.
type cloudinaryBody struct {
	Buffer      bytes.Buffer
	ContentType string
}

// buildCloudinaryBody constructs a multipart form body for Cloudinary upload.
func buildCloudinaryBody(file io.Reader, uploadPreset string) (*cloudinaryBody, error) {
	var buf bytes.Buffer
	mpw := multipart.NewWriter(&buf)

	if err := mpw.WriteField("upload_preset", uploadPreset); err != nil {
		return nil, err
	}

	fw, err := mpw.CreateFormFile("file", "location.webp")
	if err != nil {
		return nil, err
	}

	if _, err := io.Copy(fw, file); err != nil {
		return nil, err
	}

	if err := mpw.Close(); err != nil {
		return nil, err
	}

	return &cloudinaryBody{Buffer: buf, ContentType: mpw.FormDataContentType()}, nil
}

// parseCloudinaryResponse extracts the secure_url from a Cloudinary upload response.
func parseCloudinaryResponse(raw []byte) (string, error) {
	var resp cloudinaryUploadResp
	if err := json.Unmarshal(raw, &resp); err != nil {
		return "", err
	}
	if resp.Error != nil {
		return "", fmt.Errorf("cloudinary error: %s", resp.Error.Message)
	}
	if resp.SecureURL == "" {
		return "", fmt.Errorf("cloudinary response missing secure_url")
	}
	return resp.SecureURL, nil
}

// writeUploadError sends a JSON error response with the given status code.
func writeUploadError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
