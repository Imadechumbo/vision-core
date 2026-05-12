package github

import (
	"os"
	"regexp"
	"strings"
)

var secretRedactors = []*regexp.Regexp{
	regexp.MustCompile(`ghp_[A-Za-z0-9_]+`),
	regexp.MustCompile(`github_pat_[A-Za-z0-9_]+`),
	regexp.MustCompile(`(?i)x-access-token[:=][^@\s]+`),
	regexp.MustCompile(`(?i)Authorization:\s*Bearer\s+[^\s]+`),
}

func RedactSecrets(value string) string {
	redacted := value
	for _, re := range secretRedactors {
		redacted = re.ReplaceAllString(redacted, "[REDACTED]")
	}
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		redacted = strings.ReplaceAll(redacted, token, "[REDACTED]")
	}
	return redacted
}
