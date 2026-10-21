package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

const maxJSONRequestBytes = 64 << 10

func decodeJSONRequest(
	w http.ResponseWriter,
	r *http.Request,
	destination any,
	invalidMessage string,
) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONRequestBytes)
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(destination)
	if err == nil {
		err = decoder.Decode(&struct{}{})
		if errors.Is(err, io.EOF) {
			return true
		}
	}

	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "Request body is too large", http.StatusRequestEntityTooLarge)
			return false
		}

		http.Error(w, invalidMessage, http.StatusBadRequest)
		return false
	}

	http.Error(w, invalidMessage, http.StatusBadRequest)
	return false
}
