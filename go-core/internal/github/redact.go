package github

import (
	"errors"
	"regexp"
	"strings"
)

var gitSecretRedactors = []*regexp.Regexp{
	regexp.MustCompile(`ghp_[A-Za-z0-9_]+`),
	regexp.MustCompile(`github_pat_[A-Za-z0-9_]+`),
	regexp.MustCompile(`(?i)x-access-token[:=][^\s/@]+`),
	regexp.MustCompile(`(?i)Authorization\s*:\s*Bearer\s+[^\s]+`),
	regexp.MustCompile(`(?i)GITHUB_TOKEN\s*[:=]\s*[^\s]+`),
}

// RedactGitError removes common GitHub credential forms from git errors before
// callers return them to logs, JSON responses, or mission output.
func RedactGitError(err error) error {
	if err == nil {
		return nil
	}
	return errors.New(redactGitSecrets(err.Error()))
}

func redactGitSecrets(message string) string {
	redacted := strings.TrimSpace(message)
	for _, re := range gitSecretRedactors {
		redacted = re.ReplaceAllString(redacted, "[REDACTED]")
	}
	return redacted
}
