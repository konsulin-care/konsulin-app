package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

// testCloudinaryServer returns a test server that mocks Cloudinary's upload API.
func testCloudinaryServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Verify multipart form contains expected fields
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"bad request"}`))
			return
		}

		uploadPreset := r.FormValue("upload_preset")
		if uploadPreset != "test-preset" {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"missing upload_preset"}`))
			return
		}

		file, _, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"missing file"}`))
			return
		}
		defer file.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"secure_url": "https://res.cloudinary.com/test/image/upload/v1/locations/sample.webp",
		})
	}))
}

func TestUploadHandler_success(t *testing.T) {
	cloudinary := testCloudinaryServer()
	t.Cleanup(cloudinary.Close)

	handler := NewUploadHandler(UploadOptions{
		CloudinaryCloudName:    "test",
		CloudinaryUploadPreset: "test-preset",
		CloudinaryBaseURL:      cloudinary.URL,
	})

	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	// Build multipart form with a test file
	var buf bytes.Buffer
	mpw := multipart.NewWriter(&buf)
	fw, err := mpw.CreateFormFile("file", "test.webp")
	if err != nil {
		t.Fatal(err)
	}
	_, err = io.Copy(fw, bytes.NewReader([]byte("fake-image-bytes")))
	if err != nil {
		t.Fatal(err)
	}
	mpw.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL, &buf)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", mpw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result["url"] != "https://res.cloudinary.com/test/image/upload/v1/locations/sample.webp" {
		t.Errorf("unexpected url: %q", result["url"])
	}
}

func TestUploadHandler_missingFile(t *testing.T) {
	handler := NewUploadHandler(UploadOptions{
		CloudinaryCloudName:    "test",
		CloudinaryUploadPreset: "test-preset",
	})

	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	// No file, empty body
	req, err := http.NewRequest(http.MethodPost, srv.URL, bytes.NewReader([]byte{}))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "multipart/form-data; boundary=test")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result["error"] == "" {
		t.Error("expected error message, got empty")
	}
}

func TestUploadHandler_cloudinaryFailure(t *testing.T) {
	// Cloudinary mock that returns 500
	cloudinary := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"upload failed"}`))
	}))
	t.Cleanup(cloudinary.Close)

	handler := NewUploadHandler(UploadOptions{
		CloudinaryCloudName:    "test",
		CloudinaryUploadPreset: "test-preset",
		CloudinaryBaseURL:      cloudinary.URL,
	})

	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	var buf bytes.Buffer
	mpw := multipart.NewWriter(&buf)
	fw, _ := mpw.CreateFormFile("file", "test.webp")
	_, _ = io.Copy(fw, bytes.NewReader([]byte("fake-image-bytes")))
	mpw.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL, &buf)
	req.Header.Set("Content-Type", mpw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", resp.StatusCode)
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result["error"] == "" {
		t.Error("expected error message, got empty")
	}
}

// Test that NewUploadHandler returns a non-nil function.
func TestNewUploadHandler_returnsHandler(t *testing.T) {
	h := NewUploadHandler(UploadOptions{
		CloudinaryCloudName:    "test",
		CloudinaryUploadPreset: "test-preset",
	})
	if h == nil {
		t.Error("expected non-nil handler")
	}
}
