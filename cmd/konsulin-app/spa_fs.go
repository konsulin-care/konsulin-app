package main

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
)

// spaFS wraps http.Dir to support clean URLs for static HTML export.
// Retries with ".html" appended when a path without extension is not found.
type spaFS struct {
	http.Dir
}

func (f *spaFS) Open(name string) (http.File, error) {
	file, err := f.Dir.Open(name)
	if err != nil {
		if os.IsNotExist(err) && filepath.Ext(name) == "" {
			if file, err := f.Dir.Open(name + ".html"); err == nil {
				return file, nil
			}
		}
		return nil, err
	}
	// Flat HTML export uses files like clinic.html, so a directory at the
	// clean URL path (e.g. /clinic) is unexpected — prefer the .html variant.
	if path.Clean("/"+name) != "/" {
		if stat, _ := file.Stat(); stat != nil && stat.IsDir() {
			_ = file.Close()
			if file, err := f.Dir.Open(name + ".html"); err == nil {
				return file, nil
			}
			return nil, os.ErrNotExist
		}
	}
	return file, nil
}
